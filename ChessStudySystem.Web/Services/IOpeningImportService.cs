using ChessStudySystem.Web.Data;
using ChessStudySystem.Web.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace ChessStudySystem.Web.Services
{
    public interface IOpeningImportService
    {
        Task<ImportResult> ImportFromJsonAsync(Stream jsonStream, CancellationToken cancellationToken = default);
        Task<ImportResult> ValidateJsonStructureAsync(Stream jsonStream);
    }

    public class OpeningImportService : IOpeningImportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<OpeningImportService> _logger;

        public OpeningImportService(ApplicationDbContext context, ILogger<OpeningImportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ImportResult> ValidateJsonStructureAsync(Stream jsonStream)
        {
            var result = new ImportResult();
            
            try
            {
                jsonStream.Position = 0;
                using var reader = new StreamReader(jsonStream);
                var jsonContent = await reader.ReadToEndAsync();
                
                var openingData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonContent);
                
                if (openingData == null || !openingData.Any())
                {
                    result.Errors.Add("JSON file is empty or invalid format");
                    return result;
                }

                // Validate structure of first few entries
                int validatedCount = 0;
                foreach (var kvp in openingData.Take(5))
                {
                    if (!IsValidFen(kvp.Key))
                    {
                        result.Errors.Add($"Invalid FEN format: {kvp.Key}");
                    }

                    if (!HasRequiredFields(kvp.Value))
                    {
                        result.Errors.Add($"Missing required fields in entry: {kvp.Key}");
                    }

                    validatedCount++;
                }

                result.ProcessedCount = openingData.Count;
                result.Success = result.Errors.Count == 0;
                result.Message = result.Success ? 
                    $"Validation successful. {result.ProcessedCount} entries found." : 
                    $"Validation found {result.Errors.Count} issues.";

                return result;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON validation failed");
                result.Errors.Add($"Invalid JSON format: {ex.Message}");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during validation");
                result.Errors.Add($"Validation error: {ex.Message}");
                return result;
            }
        }

        public async Task<ImportResult> ImportFromJsonAsync(Stream jsonStream, CancellationToken cancellationToken = default)
        {
            var result = new ImportResult();
            
            try
            {
                jsonStream.Position = 0;
                using var reader = new StreamReader(jsonStream);
                var jsonContent = await reader.ReadToEndAsync();
                
                var openingData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonContent);
                
                if (openingData == null)
                {
                    result.Errors.Add("Invalid JSON format");
                    return result;
                }

                if (!openingData.Any())
                {
                    result.Errors.Add("JSON file is empty");
                    return result;
                }

                // Quick validation of first few entries
                var validationErrors = new List<string>();
                foreach (var kvp in openingData.Take(5))
                {
                    if (!IsValidFen(kvp.Key))
                    {
                        validationErrors.Add($"Invalid FEN format: {kvp.Key}");
                    }

                    if (!HasRequiredFields(kvp.Value))
                    {
                        validationErrors.Add($"Missing required fields in entry: {kvp.Key}");
                    }
                }

                if (validationErrors.Any())
                {
                    result.Errors.AddRange(validationErrors);
                    result.Message = "Validation failed";
                    return result;
                }

                var openingsToAdd = new List<Opening>();
                const int batchSize = 1000;

                foreach (var kvp in openingData)
                {
                    try
                    {
                        if (cancellationToken.IsCancellationRequested)
                        {
                            result.Message = "Import was cancelled";
                            break;
                        }

                        var fen = kvp.Key;
                        var data = kvp.Value;

                        // Check if this opening already exists
                        var existingOpening = await _context.Openings
                            .FirstOrDefaultAsync(o => o.Fen == fen, cancellationToken);

                        if (existingOpening != null)
                        {
                            result.SkippedCount++;
                            continue;
                        }

                        var opening = CreateOpeningFromJson(fen, data);
                        if (opening != null)
                        {
                            openingsToAdd.Add(opening);
                            result.ProcessedCount++;
                        }
                        else
                        {
                            result.ErrorCount++;
                            result.Errors.Add($"Failed to parse opening: {fen}");
                        }

                        // Process in batches
                        if (openingsToAdd.Count >= batchSize)
                        {
                            await SaveBatchAsync(openingsToAdd, cancellationToken);
                            openingsToAdd.Clear();
                            _logger.LogInformation($"Processed batch. Total: {result.ProcessedCount}");
                        }
                    }
                    catch (Exception ex)
                    {
                        result.ErrorCount++;
                        result.Errors.Add($"Error processing {kvp.Key}: {ex.Message}");
                        _logger.LogError(ex, $"Error processing opening with FEN: {kvp.Key}");
                    }
                }

                // Save any remaining openings
                if (openingsToAdd.Count > 0)
                {
                    await SaveBatchAsync(openingsToAdd, cancellationToken);
                }

                result.Success = result.ErrorCount == 0;
                result.Message = $"Import completed. Processed: {result.ProcessedCount}, Skipped: {result.SkippedCount}, Errors: {result.ErrorCount}";
                
                _logger.LogInformation(result.Message);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error during import");
                result.Errors.Add($"Import failed: {ex.Message}");
                result.Success = false;
                return result;
            }
        }

        private async Task SaveBatchAsync(List<Opening> openings, CancellationToken cancellationToken)
        {
            try
            {
                _context.Openings.AddRange(openings);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving batch to database");
                throw;
            }
        }

        private Opening? CreateOpeningFromJson(string fen, JsonElement data)
        {
            try
            {
                return new Opening
                {
                    Fen = fen,
                    Src = GetStringProperty(data, "src"),
                    Eco = GetStringProperty(data, "eco"),
                    Moves = GetStringProperty(data, "moves"),
                    Name = GetStringProperty(data, "name"),
                    Scid = GetStringProperty(data, "scid"),
                    Aliases = GetAliases(data)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating opening from JSON for FEN: {fen}");
                return null;
            }
        }

        private static string? GetStringProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String)
            {
                return property.GetString();
            }
            return null;
        }

        private static Dictionary<string, string> GetAliases(JsonElement element)
        {
            var aliases = new Dictionary<string, string>();
            
            if (element.TryGetProperty("aliases", out var aliasProperty) && aliasProperty.ValueKind == JsonValueKind.Object)
            {
                foreach (var alias in aliasProperty.EnumerateObject())
                {
                    if (alias.Value.ValueKind == JsonValueKind.String)
                    {
                        var value = alias.Value.GetString();
                        if (!string.IsNullOrEmpty(value))
                        {
                            aliases[alias.Name] = value;
                        }
                    }
                }
            }
            
            return aliases;
        }

        private bool IsValidFen(string fen)
        {
            // Basic FEN validation - should have 4-6 parts separated by spaces
            var parts = fen.Split(' ');
            return parts.Length >= 4 && parts.Length <= 6;
        }

        private bool HasRequiredFields(JsonElement element)
        {
            // Check for required fields
            return element.TryGetProperty("name", out _) || 
                   element.TryGetProperty("eco", out _) || 
                   element.TryGetProperty("moves", out _);
        }
    }
}