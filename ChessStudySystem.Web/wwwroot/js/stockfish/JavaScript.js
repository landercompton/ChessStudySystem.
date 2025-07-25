﻿var Sf17179Web = (() => {
    var _scriptName = import.meta.url;

    return async function (moduleArg = {}) {
        var moduleRtn;

        var h = moduleArg,
            aa,
            ba,
            ha = new Promise((a, b) => {
                aa = a;
                ba = b;
            }),
            ia = "object" == typeof window,
            k = "undefined" != typeof WorkerGlobalScope,
            l = k && self.name?.startsWith("em-pthread");
        h.listen || (h.listen = (a) => console.log(a));
        h.onError || (h.onError = (a) => console.error(a));
        h.getRecommendedNnue = (a = 0) => ja(ka(a));
        h.setNnueBuffer = function (a, b = 0) {
            if (!a) throw Error("buf is null");
            if (0 >= a.byteLength) throw Error(`${a.byteLength} bytes?`);
            const c = la(a.byteLength);
            if (!c) throw Error(`could not allocate ${a.byteLength} bytes`);
            h.HEAPU8.set(a, c);
            ma(c, a.byteLength, b);
        };
        h.uci = function (a) {
            const b = na(a) + 1,
                c = la(b);
            if (!c) throw Error(`Could not allocate ${b} bytes`);
            oa(a, pa(), c, b);
            qa(c);
        };
        h.print = (a) => h.listen?.(a);
        h.printErr = (a) => h.onError?.(a);
        var ra = [],
            p = "",
            sa,
            ua;
        if (ia || k)
            (k
                ? (p = self.location.href)
                : "undefined" != typeof document &&
                document.currentScript &&
                (p = document.currentScript.src),
                _scriptName && (p = _scriptName),
                p.startsWith("blob:")
                    ? (p = "")
                    : (p = p.slice(0, p.replace(/[?#].*/, "").lastIndexOf("/") + 1)),
                k &&
                (ua = (a) => {
                    var b = new XMLHttpRequest();
                    b.open("GET", a, !1);
                    b.responseType = "arraybuffer";
                    b.send(null);
                    return new Uint8Array(b.response);
                }),
                (sa = async (a) => {
                    a = await fetch(a, { credentials: "same-origin" });
                    if (a.ok) return a.arrayBuffer();
                    throw Error(a.status + " : " + a.url);
                }));
        var va = console.log.bind(console),
            q = console.error.bind(console),
            t,
            wa,
            xa = !1,
            u,
            v,
            ya,
            za,
            Aa,
            Ba,
            w,
            Ca,
            Da = !1;
        function x() {
            t.buffer != v.buffer && z();
            return v;
        }
        function pa() {
            t.buffer != v.buffer && z();
            return ya;
        }
        function Ea() {
            t.buffer != v.buffer && z();
            return za;
        }
        function A() {
            t.buffer != v.buffer && z();
            return Aa;
        }
        function B() {
            t.buffer != v.buffer && z();
            return Ba;
        }
        function Fa() {
            t.buffer != v.buffer && z();
            return Ca;
        }
        if (l) {
            var Ga,
                Ha = !1;
            self.onunhandledrejection = (b) => {
                throw b.reason || b;
            };
            function a(b) {
                try {
                    var c = b.data,
                        d = c.la;
                    if ("load" === d) {
                        let e = [];
                        self.onmessage = (f) => e.push(f);
                        self.startWorker = () => {
                            postMessage({ la: "loaded" });
                            for (let f of e) a(f);
                            self.onmessage = a;
                        };
                        for (const f of c.Xa)
                            if (!h[f] || h[f].proxy)
                                ((h[f] = (...g) => {
                                    postMessage({ la: "callHandler", Wa: f, Ua: g });
                                }),
                                    "print" == f && (va = h[f]),
                                    "printErr" == f && (q = h[f]));
                        t = c.jb;
                        z();
                        Ga(c.kb);
                    } else if ("run" === d) {
                        Ia(c.ja);
                        Ja(c.ja, 0, 0, 1, 0, 0);
                        Ka();
                        La(c.ja);
                        Ha ||= !0;
                        try {
                            Ma(c.fb, c.Ca);
                        } catch (e) {
                            if ("unwind" != e) throw e;
                        }
                    } else
                        "setimmediate" !== c.target &&
                            ("checkMailbox" === d
                                ? Ha && Na()
                                : d && (q(`worker: received unknown command ${d}`), q(c)));
                } catch (e) {
                    throw (Oa(), e);
                }
            }
            self.onmessage = a;
        }
        function z() {
            var a = t.buffer;
            v = new Int8Array(a);
            za = new Int16Array(a);
            h.HEAPU8 = ya = new Uint8Array(a);
            new Uint16Array(a);
            Aa = new Int32Array(a);
            Ba = new Uint32Array(a);
            new Float32Array(a);
            Ca = new Float64Array(a);
            w = new BigInt64Array(a);
            new BigUint64Array(a);
        }
        function Pa() {
            l
                ? startWorker(h)
                : (h.noFSInit ||
                    Qa ||
                    ((Qa = !0),
                        Ra("/dev/tty", "/dev/stdin"),
                        Ra("/dev/tty", "/dev/stdout"),
                        Ra("/dev/tty1", "/dev/stderr"),
                        Sa("/dev/stdin", 0),
                        Sa("/dev/stdout", 1),
                        Sa("/dev/stderr", 1)),
                    C.E(),
                    (Ta = !1));
        }
        var D = 0,
            G = null;
        function Ua() {
            D--;
            if (0 == D && G) {
                var a = G;
                G = null;
                a();
            }
        }
        function Va(a) {
            a = "Aborted(" + a + ")";
            q(a);
            xa = !0;
            a = new WebAssembly.RuntimeError(
                a + ". Build with -sASSERTIONS for more info.",
            );
            ba(a);
            throw a;
        }
        var Wa;
        async function Xa(a) {
            try {
                var b = await sa(a);
                return new Uint8Array(b);
            } catch { }
            if (ua) a = ua(a);
            else throw "both async and sync fetching of the wasm failed";
            return a;
        }
        async function Ya(a, b) {
            try {
                var c = await Xa(a);
                return await WebAssembly.instantiate(c, b);
            } catch (d) {
                (q(`failed to asynchronously prepare wasm: ${d}`), Va(d));
            }
        }
        async function Za(a) {
            var b = Wa;
            if ("function" == typeof WebAssembly.instantiateStreaming)
                try {
                    var c = fetch(b, { credentials: "same-origin" });
                    return await WebAssembly.instantiateStreaming(c, a);
                } catch (d) {
                    (q(`wasm streaming compile failed: ${d}`),
                        q("falling back to ArrayBuffer instantiation"));
                }
            return Ya(b, a);
        }
        function $a() {
            ab = {
                C: bb,
                f: cb,
                x: db,
                y: eb,
                m: fb,
                k: gb,
                B: hb,
                i: ib,
                o: jb,
                g: kb,
                j: La,
                h: lb,
                p: mb,
                r: nb,
                D: ob,
                d: pb,
                l: qb,
                c: rb,
                q: sb,
                A: tb,
                v: ub,
                s: vb,
                t: wb,
                b: xb,
                e: yb,
                w: zb,
                u: Ab,
                z: Bb,
                a: t,
                n: Cb,
            };
            return { a: ab };
        }
        class Db {
            name = "ExitStatus";
            constructor(a) {
                this.message = `Program terminated with exit(${a})`;
                this.status = a;
            }
        }
        var Eb = (a) => {
            a.terminate();
            a.onmessage = () => { };
        },
            Fb = [],
            Ib = (a) => {
                0 == H.length && (Gb(), Hb(H[0]));
                var b = H.pop();
                if (!b) return 6;
                I.push(b);
                J[a.ja] = b;
                b.ja = a.ja;
                b.postMessage({ la: "run", fb: a.eb, Ca: a.Ca, ja: a.ja }, a.Sa);
                return 0;
            },
            K = 0,
            ub = () => 0 < K,
            L = (a, b, ...c) => {
                for (
                    var d = 2 * c.length, e = Jb(), f = Kb(8 * d), g = f >> 3, m = 0;
                    m < c.length;
                    m++
                ) {
                    var r = c[m];
                    "bigint" == typeof r
                        ? ((w[g + 2 * m] = 1n), (w[g + 2 * m + 1] = r))
                        : ((w[g + 2 * m] = 0n), (Fa()[g + 2 * m + 1] = r));
                }
                a = Lb(a, 0, d, f, b);
                Mb(e);
                return a;
            };
        function Cb(a) {
            if (l) return L(0, 1, a);
            u = a;
            0 < K || (Nb(), (xa = !0));
            throw new Db(a);
        }
        function Ob(a) {
            if (l) return L(1, 0, a);
            --K;
            xb(a);
        }
        var xb = (a) => {
            u = a;
            if (l) throw (Ob(a), "unwind");
            if (!(0 < K || l)) {
                Pb();
                Qa = !1;
                Qb(0);
                for (var b of M) b && Rb(b);
                Nb();
                Da = !0;
            }
            Cb(a);
        },
            H = [],
            I = [],
            Sb = [],
            J = {};
        function Tb() {
            for (var a = navigator.hardwareConcurrency; a--;) Gb();
            Fb.push(() => {
                D++;
                Ub(() => Ua());
            });
        }
        var Nb = () => {
            for (var a of I) Eb(a);
            for (a of H) Eb(a);
            H = [];
            I = [];
            J = {};
        },
            Wb = (a) => {
                var b = a.ja;
                delete J[b];
                H.push(a);
                I.splice(I.indexOf(a), 1);
                a.ja = 0;
                Vb(b);
            };
        function Ka() {
            Sb.forEach((a) => a());
        }
        var Hb = (a) =>
            new Promise((b) => {
                a.onmessage = (f) => {
                    f = f.data;
                    var g = f.la;
                    if (f.Ba && f.Ba != Xb()) {
                        var m = J[f.Ba];
                        m
                            ? m.postMessage(f, f.Sa)
                            : q(
                                `Internal error! Worker sent a message "${g}" to target pthread ${f.Ba}, but that thread no longer exists!`,
                            );
                    } else if ("checkMailbox" === g) Na();
                    else if ("spawnThread" === g) Ib(f);
                    else if ("cleanupThread" === g) Wb(J[f.gb]);
                    else if ("loaded" === g) ((a.loaded = !0), b(a));
                    else if ("setimmediate" === f.target) a.postMessage(f);
                    else if ("callHandler" === g) h[f.Wa](...f.Ua);
                    else g && q(`worker sent an unknown command ${g}`);
                };
                a.onerror = (f) => {
                    q(
                        `${"worker sent an error!"} ${f.filename}:${f.lineno}: ${f.message}`,
                    );
                    throw f;
                };
                var c = [],
                    d = ["print", "printErr"],
                    e;
                for (e of d) h.propertyIsEnumerable(e) && c.push(e);
                a.postMessage({ la: "load", Xa: c, jb: t, kb: wa });
            });
        function Ub(a) {
            l ? a() : Promise.all(H.map(Hb)).then(a);
        }
        function Gb() {
            if (h.mainScriptUrlOrBlob) {
                var a = h.mainScriptUrlOrBlob;
                "string" != typeof a && (a = URL.createObjectURL(a));
                a = new Worker(a, { type: "module", name: "em-pthread" });
            } else
                a = new Worker(new URL("sf171-79.js", import.meta.url), {
                    type: "module",
                    name: "em-pthread",
                });
            H.push(a);
        }
        var Ia = (a) => {
            z();
            var b = B()[(a + 52) >> 2];
            a = B()[(a + 56) >> 2];
            Yb(b, b - a);
            Mb(b);
        },
            Zb = [],
            $b,
            Ma = (a, b) => {
                K = 0;
                var c = Zb[a];
                c || (Zb[a] = c = $b.get(a));
                a = c(b);
                0 < K ? (u = a) : ac(a);
            };
        function bc(a, b, c, d) {
            return l ? L(2, 1, a, b, c, d) : bb(a, b, c, d);
        }
        var bb = (a, b, c, d) => {
            if ("undefined" == typeof SharedArrayBuffer) return 6;
            var e = [];
            if (l && 0 === e.length) return bc(a, b, c, d);
            a = { eb: c, ja: a, Ca: d, Sa: e };
            return l ? ((a.la = "spawnThread"), postMessage(a, e), 0) : Ib(a);
        },
            O = () => {
                var a = A()[+N >> 2];
                N += 4;
                return a;
            },
            cc = (a, b) => {
                for (var c = 0, d = a.length - 1; 0 <= d; d--) {
                    var e = a[d];
                    "." === e
                        ? a.splice(d, 1)
                        : ".." === e
                            ? (a.splice(d, 1), c++)
                            : c && (a.splice(d, 1), c--);
                }
                if (b) for (; c; c--) a.unshift("..");
                return a;
            },
            dc = (a) => {
                var b = "/" === a.charAt(0),
                    c = "/" === a.slice(-1);
                (a = cc(
                    a.split("/").filter((d) => !!d),
                    !b,
                ).join("/")) ||
                    b ||
                    (a = ".");
                a && c && (a += "/");
                return (b ? "/" : "") + a;
            },
            ec = (a) => {
                var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/
                    .exec(a)
                    .slice(1);
                a = b[0];
                b = b[1];
                if (!a && !b) return ".";
                b &&= b.slice(0, -1);
                return a + b;
            },
            fc = () => (a) =>
                a.set(crypto.getRandomValues(new Uint8Array(a.byteLength))),
            gc = (a) => {
                (gc = fc())(a);
            },
            hc = (...a) => {
                for (var b = "", c = !1, d = a.length - 1; -1 <= d && !c; d--) {
                    c = 0 <= d ? a[d] : "/";
                    if ("string" != typeof c)
                        throw new TypeError("Arguments to path.resolve must be strings");
                    if (!c) return "";
                    b = c + "/" + b;
                    c = "/" === c.charAt(0);
                }
                b = cc(
                    b.split("/").filter((e) => !!e),
                    !c,
                ).join("/");
                return (c ? "/" : "") + b || ".";
            },
            ic = "undefined" != typeof TextDecoder ? new TextDecoder() : void 0,
            P = (a, b = 0, c = NaN) => {
                var d = b + c;
                for (c = b; a[c] && !(c >= d);) ++c;
                if (16 < c - b && a.buffer && ic)
                    return ic.decode(
                        a.buffer instanceof ArrayBuffer ? a.subarray(b, c) : a.slice(b, c),
                    );
                for (d = ""; b < c;) {
                    var e = a[b++];
                    if (e & 128) {
                        var f = a[b++] & 63;
                        if (192 == (e & 224)) d += String.fromCharCode(((e & 31) << 6) | f);
                        else {
                            var g = a[b++] & 63;
                            e =
                                224 == (e & 240)
                                    ? ((e & 15) << 12) | (f << 6) | g
                                    : ((e & 7) << 18) | (f << 12) | (g << 6) | (a[b++] & 63);
                            65536 > e
                                ? (d += String.fromCharCode(e))
                                : ((e -= 65536),
                                    (d += String.fromCharCode(
                                        55296 | (e >> 10),
                                        56320 | (e & 1023),
                                    )));
                        }
                    } else d += String.fromCharCode(e);
                }
                return d;
            },
            jc = [],
            na = (a) => {
                for (var b = 0, c = 0; c < a.length; ++c) {
                    var d = a.charCodeAt(c);
                    127 >= d
                        ? b++
                        : 2047 >= d
                            ? (b += 2)
                            : 55296 <= d && 57343 >= d
                                ? ((b += 4), ++c)
                                : (b += 3);
                }
                return b;
            },
            oa = (a, b, c, d) => {
                if (!(0 < d)) return 0;
                var e = c;
                d = c + d - 1;
                for (var f = 0; f < a.length; ++f) {
                    var g = a.charCodeAt(f);
                    if (55296 <= g && 57343 >= g) {
                        var m = a.charCodeAt(++f);
                        g = (65536 + ((g & 1023) << 10)) | (m & 1023);
                    }
                    if (127 >= g) {
                        if (c >= d) break;
                        b[c++] = g;
                    } else {
                        if (2047 >= g) {
                            if (c + 1 >= d) break;
                            b[c++] = 192 | (g >> 6);
                        } else {
                            if (65535 >= g) {
                                if (c + 2 >= d) break;
                                b[c++] = 224 | (g >> 12);
                            } else {
                                if (c + 3 >= d) break;
                                b[c++] = 240 | (g >> 18);
                                b[c++] = 128 | ((g >> 12) & 63);
                            }
                            b[c++] = 128 | ((g >> 6) & 63);
                        }
                        b[c++] = 128 | (g & 63);
                    }
                }
                b[c] = 0;
                return c - e;
            },
            kc = [];
        function lc(a, b) {
            kc[a] = { input: [], output: [], na: b };
            mc(a, nc);
        }
        var nc = {
            open(a) {
                var b = kc[a.node.za];
                if (!b) throw new R(43);
                a.da = b;
                a.seekable = !1;
            },
            close(a) {
                a.da.na.wa(a.da);
            },
            wa(a) {
                a.da.na.wa(a.da);
            },
            read(a, b, c, d) {
                if (!a.da || !a.da.na.La) throw new R(60);
                for (var e = 0, f = 0; f < d; f++) {
                    try {
                        var g = a.da.na.La(a.da);
                    } catch (m) {
                        throw new R(29);
                    }
                    if (void 0 === g && 0 === e) throw new R(6);
                    if (null === g || void 0 === g) break;
                    e++;
                    b[c + f] = g;
                }
                e && (a.node.ra = Date.now());
                return e;
            },
            write(a, b, c, d) {
                if (!a.da || !a.da.na.Ga) throw new R(60);
                try {
                    for (var e = 0; e < d; e++) a.da.na.Ga(a.da, b[c + e]);
                } catch (f) {
                    throw new R(29);
                }
                d && (a.node.ga = a.node.fa = Date.now());
                return e;
            },
        },
            oc = {
                La() {
                    a: {
                        if (!jc.length) {
                            var a = null;
                            "undefined" != typeof window &&
                                "function" == typeof window.prompt &&
                                ((a = window.prompt("Input: ")), null !== a && (a += "\n"));
                            if (!a) {
                                var b = null;
                                break a;
                            }
                            b = Array(na(a) + 1);
                            a = oa(a, b, 0, b.length);
                            b.length = a;
                            jc = b;
                        }
                        b = jc.shift();
                    }
                    return b;
                },
                Ga(a, b) {
                    null === b || 10 === b
                        ? (va(P(a.output)), (a.output = []))
                        : 0 != b && a.output.push(b);
                },
                wa(a) {
                    0 < a.output?.length && (va(P(a.output)), (a.output = []));
                },
                Za() {
                    return {
                        pb: 25856,
                        rb: 5,
                        ob: 191,
                        qb: 35387,
                        nb: [
                            3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        ],
                    };
                },
                $a() {
                    return 0;
                },
                ab() {
                    return [24, 80];
                },
            },
            pc = {
                Ga(a, b) {
                    null === b || 10 === b
                        ? (q(P(a.output)), (a.output = []))
                        : 0 != b && a.output.push(b);
                },
                wa(a) {
                    0 < a.output?.length && (q(P(a.output)), (a.output = []));
                },
            },
            S = {
                ia: null,
                ma() {
                    return S.createNode(null, "/", 16895, 0);
                },
                createNode(a, b, c, d) {
                    if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new R(63);
                    S.ia ||
                        (S.ia = {
                            dir: {
                                node: {
                                    qa: S.ca.qa,
                                    ka: S.ca.ka,
                                    ta: S.ca.ta,
                                    xa: S.ca.xa,
                                    Qa: S.ca.Qa,
                                    Ta: S.ca.Ta,
                                    Ra: S.ca.Ra,
                                    Ha: S.ca.Ha,
                                    Aa: S.ca.Aa,
                                },
                                stream: { ha: S.aa.ha },
                            },
                            file: {
                                node: { qa: S.ca.qa, ka: S.ca.ka },
                                stream: {
                                    ha: S.aa.ha,
                                    read: S.aa.read,
                                    write: S.aa.write,
                                    Na: S.aa.Na,
                                    Pa: S.aa.Pa,
                                },
                            },
                            link: {
                                node: { qa: S.ca.qa, ka: S.ca.ka, ua: S.ca.ua },
                                stream: {},
                            },
                            Ja: { node: { qa: S.ca.qa, ka: S.ca.ka }, stream: qc },
                        });
                    c = rc(a, b, c, d);
                    16384 === (c.mode & 61440)
                        ? ((c.ca = S.ia.dir.node), (c.aa = S.ia.dir.stream), (c.ba = {}))
                        : 32768 === (c.mode & 61440)
                            ? ((c.ca = S.ia.file.node),
                                (c.aa = S.ia.file.stream),
                                (c.ea = 0),
                                (c.ba = null))
                            : 40960 === (c.mode & 61440)
                                ? ((c.ca = S.ia.link.node), (c.aa = S.ia.link.stream))
                                : 8192 === (c.mode & 61440) &&
                                ((c.ca = S.ia.Ja.node), (c.aa = S.ia.Ja.stream));
                    c.ra = c.ga = c.fa = Date.now();
                    a && ((a.ba[b] = c), (a.ra = a.ga = a.fa = c.ra));
                    return c;
                },
                vb(a) {
                    return a.ba
                        ? a.ba.subarray
                            ? a.ba.subarray(0, a.ea)
                            : new Uint8Array(a.ba)
                        : new Uint8Array(0);
                },
                ca: {
                    qa(a) {
                        var b = {};
                        b.sb = 8192 === (a.mode & 61440) ? a.id : 1;
                        b.xb = a.id;
                        b.mode = a.mode;
                        b.yb = 1;
                        b.uid = 0;
                        b.wb = 0;
                        b.za = a.za;
                        16384 === (a.mode & 61440)
                            ? (b.size = 4096)
                            : 32768 === (a.mode & 61440)
                                ? (b.size = a.ea)
                                : 40960 === (a.mode & 61440)
                                    ? (b.size = a.link.length)
                                    : (b.size = 0);
                        b.ra = new Date(a.ra);
                        b.ga = new Date(a.ga);
                        b.fa = new Date(a.fa);
                        b.Va = 4096;
                        b.mb = Math.ceil(b.size / b.Va);
                        return b;
                    },
                    ka(a, b) {
                        for (var c of ["mode", "atime", "mtime", "ctime"])
                            null != b[c] && (a[c] = b[c]);
                        void 0 !== b.size &&
                            ((b = b.size),
                                a.ea != b &&
                                (0 == b
                                    ? ((a.ba = null), (a.ea = 0))
                                    : ((c = a.ba),
                                        (a.ba = new Uint8Array(b)),
                                        c && a.ba.set(c.subarray(0, Math.min(b, a.ea))),
                                        (a.ea = b))));
                    },
                    ta() {
                        throw S.Ka;
                    },
                    xa(a, b, c, d) {
                        return S.createNode(a, b, c, d);
                    },
                    Qa(a, b, c) {
                        try {
                            var d = sc(b, c);
                        } catch (f) { }
                        if (d) {
                            if (16384 === (a.mode & 61440))
                                for (var e in d.ba) throw new R(55);
                            e = tc(d.parent.id, d.name);
                            if (T[e] === d) T[e] = d.sa;
                            else
                                for (e = T[e]; e;) {
                                    if (e.sa === d) {
                                        e.sa = d.sa;
                                        break;
                                    }
                                    e = e.sa;
                                }
                        }
                        delete a.parent.ba[a.name];
                        b.ba[c] = a;
                        a.name = c;
                        b.fa = b.ga = a.parent.fa = a.parent.ga = Date.now();
                    },
                    Ta(a, b) {
                        delete a.ba[b];
                        a.fa = a.ga = Date.now();
                    },
                    Ra(a, b) {
                        var c = sc(a, b),
                            d;
                        for (d in c.ba) throw new R(55);
                        delete a.ba[b];
                        a.fa = a.ga = Date.now();
                    },
                    Ha(a) {
                        return [".", "..", ...Object.keys(a.ba)];
                    },
                    Aa(a, b, c) {
                        a = S.createNode(a, b, 41471, 0);
                        a.link = c;
                        return a;
                    },
                    ua(a) {
                        if (40960 !== (a.mode & 61440)) throw new R(28);
                        return a.link;
                    },
                },
                aa: {
                    read(a, b, c, d, e) {
                        var f = a.node.ba;
                        if (e >= a.node.ea) return 0;
                        a = Math.min(a.node.ea - e, d);
                        if (8 < a && f.subarray) b.set(f.subarray(e, e + a), c);
                        else for (d = 0; d < a; d++) b[c + d] = f[e + d];
                        return a;
                    },
                    write(a, b, c, d, e, f) {
                        b.buffer === x().buffer && (f = !1);
                        if (!d) return 0;
                        a = a.node;
                        a.ga = a.fa = Date.now();
                        if (b.subarray && (!a.ba || a.ba.subarray)) {
                            if (f) return ((a.ba = b.subarray(c, c + d)), (a.ea = d));
                            if (0 === a.ea && 0 === e)
                                return ((a.ba = b.slice(c, c + d)), (a.ea = d));
                            if (e + d <= a.ea) return (a.ba.set(b.subarray(c, c + d), e), d);
                        }
                        f = e + d;
                        var g = a.ba ? a.ba.length : 0;
                        g >= f ||
                            ((f = Math.max(f, (g * (1048576 > g ? 2 : 1.125)) >>> 0)),
                                0 != g && (f = Math.max(f, 256)),
                                (g = a.ba),
                                (a.ba = new Uint8Array(f)),
                                0 < a.ea && a.ba.set(g.subarray(0, a.ea), 0));
                        if (a.ba.subarray && b.subarray) a.ba.set(b.subarray(c, c + d), e);
                        else for (f = 0; f < d; f++) a.ba[e + f] = b[c + f];
                        a.ea = Math.max(a.ea, e + d);
                        return d;
                    },
                    ha(a, b, c) {
                        1 === c
                            ? (b += a.position)
                            : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.ea);
                        if (0 > b) throw new R(28);
                        return b;
                    },
                    Na(a, b, c, d, e) {
                        if (32768 !== (a.node.mode & 61440)) throw new R(43);
                        a = a.node.ba;
                        if (e & 2 || !a || a.buffer !== x().buffer) {
                            d = !0;
                            Va();
                            e = void 0;
                            if (!e) throw new R(48);
                            if (a) {
                                if (0 < c || c + b < a.length)
                                    a.subarray
                                        ? (a = a.subarray(c, c + b))
                                        : (a = Array.prototype.slice.call(a, c, c + b));
                                x().set(a, e);
                            }
                        } else ((d = !1), (e = a.byteOffset));
                        return { Ab: e, lb: d };
                    },
                    Pa(a, b, c, d) {
                        S.aa.write(a, b, 0, d, c, !1);
                        return 0;
                    },
                },
            },
            uc = (a) => {
                var b = 0;
                a && (b |= 365);
                return b;
            },
            vc = null,
            wc = {},
            M = [],
            xc = 1,
            T = null,
            Qa = !1,
            Ta = !0,
            R = class {
                name = "ErrnoError";
                constructor(a) {
                    this.oa = a;
                }
            },
            yc = class {
                va = {};
                node = null;
                get flags() {
                    return this.va.flags;
                }
                set flags(a) {
                    this.va.flags = a;
                }
                get position() {
                    return this.va.position;
                }
                set position(a) {
                    this.va.position = a;
                }
            },
            zc = class {
                ca = {};
                aa = {};
                ya = null;
                constructor(a, b, c, d) {
                    a ||= this;
                    this.parent = a;
                    this.ma = a.ma;
                    this.id = xc++;
                    this.name = b;
                    this.mode = c;
                    this.za = d;
                    this.ra = this.ga = this.fa = Date.now();
                }
                get read() {
                    return 365 === (this.mode & 365);
                }
                set read(a) {
                    a ? (this.mode |= 365) : (this.mode &= -366);
                }
                get write() {
                    return 146 === (this.mode & 146);
                }
                set write(a) {
                    a ? (this.mode |= 146) : (this.mode &= -147);
                }
            };
        function U(a, b = {}) {
            if (!a) throw new R(44);
            b.Ea ?? (b.Ea = !0);
            "/" === a.charAt(0) || (a = "//" + a);
            var c = 0;
            a: for (; 40 > c; c++) {
                a = a.split("/").filter((m) => !!m);
                for (var d = vc, e = "/", f = 0; f < a.length; f++) {
                    var g = f === a.length - 1;
                    if (g && b.parent) break;
                    if ("." !== a[f])
                        if (".." === a[f])
                            if (((e = ec(e)), d === d.parent)) {
                                a = e + "/" + a.slice(f + 1).join("/");
                                continue a;
                            } else d = d.parent;
                        else {
                            e = dc(e + "/" + a[f]);
                            try {
                                d = sc(d, a[f]);
                            } catch (m) {
                                if (44 === m?.oa && g && b.cb) return { path: e };
                                throw m;
                            }
                            !d.ya || (g && !b.Ea) || (d = d.ya.root);
                            if (40960 === (d.mode & 61440) && (!g || b.Da)) {
                                if (!d.ca.ua) throw new R(52);
                                d = d.ca.ua(d);
                                "/" === d.charAt(0) || (d = ec(e) + "/" + d);
                                a = d + "/" + a.slice(f + 1).join("/");
                                continue a;
                            }
                        }
                }
                return { path: e, node: d };
            }
            throw new R(32);
        }
        function tc(a, b) {
            for (var c = 0, d = 0; d < b.length; d++)
                c = ((c << 5) - c + b.charCodeAt(d)) | 0;
            return ((a + c) >>> 0) % T.length;
        }
        function sc(a, b) {
            var c =
                16384 === (a.mode & 61440)
                    ? (c = Ac(a, "x"))
                        ? c
                        : a.ca.ta
                            ? 0
                            : 2
                    : 54;
            if (c) throw new R(c);
            for (c = T[tc(a.id, b)]; c; c = c.sa) {
                var d = c.name;
                if (c.parent.id === a.id && d === b) return c;
            }
            return a.ca.ta(a, b);
        }
        function rc(a, b, c, d) {
            a = new zc(a, b, c, d);
            b = tc(a.parent.id, a.name);
            a.sa = T[b];
            return (T[b] = a);
        }
        function Bc(a) {
            var b = ["r", "w", "rw"][a & 3];
            a & 512 && (b += "w");
            return b;
        }
        function Ac(a, b) {
            if (Ta) return 0;
            if (!b.includes("r") || a.mode & 292) {
                if (
                    (b.includes("w") && !(a.mode & 146)) ||
                    (b.includes("x") && !(a.mode & 73))
                )
                    return 2;
            } else return 2;
            return 0;
        }
        function Cc(a, b) {
            if (16384 !== (a.mode & 61440)) return 54;
            try {
                return (sc(a, b), 20);
            } catch (c) { }
            return Ac(a, "wx");
        }
        function V(a) {
            a = M[a];
            if (!a) throw new R(8);
            return a;
        }
        function Dc(a, b = -1) {
            a = Object.assign(new yc(), a);
            if (-1 == b)
                a: {
                    for (b = 0; 4096 >= b; b++) if (!M[b]) break a;
                    throw new R(33);
                }
            a.pa = b;
            return (M[b] = a);
        }
        function Ec(a, b = -1) {
            a = Dc(a, b);
            a.aa?.ub?.(a);
            return a;
        }
        function Fc(a, b) {
            var c = null?.aa.ka,
                d = c ? null : a;
            c ??= a.ca.ka;
            if (!c) throw new R(63);
            c(d, b);
        }
        var qc = {
            open(a) {
                a.aa = wc[a.node.za].aa;
                a.aa.open?.(a);
            },
            ha() {
                throw new R(70);
            },
        };
        function mc(a, b) {
            wc[a] = { aa: b };
        }
        function Gc(a, b) {
            var c = "/" === b;
            if (c && vc) throw new R(10);
            if (!c && b) {
                var d = U(b, { Ea: !1 });
                b = d.path;
                d = d.node;
                if (d.ya) throw new R(10);
                if (16384 !== (d.mode & 61440)) throw new R(54);
            }
            b = { type: a, zb: {}, Oa: b, bb: [] };
            a = a.ma(b);
            a.ma = b;
            b.root = a;
            c ? (vc = a) : d && ((d.ya = b), d.ma && d.ma.bb.push(b));
        }
        function Hc(a, b, c) {
            var d = U(a, { parent: !0 }).node;
            a = a && a.match(/([^\/]+|\/)\/*$/)[1];
            if (!a) throw new R(28);
            if ("." === a || ".." === a) throw new R(20);
            var e = Cc(d, a);
            if (e) throw new R(e);
            if (!d.ca.xa) throw new R(63);
            return d.ca.xa(d, a, b, c);
        }
        function W(a) {
            return Hc(a, 16895, 0);
        }
        function Ic(a, b, c) {
            "undefined" == typeof c && ((c = b), (b = 438));
            Hc(a, b | 8192, c);
        }
        function Ra(a, b) {
            if (!hc(a)) throw new R(44);
            var c = U(b, { parent: !0 }).node;
            if (!c) throw new R(44);
            b = b && b.match(/([^\/]+|\/)\/*$/)[1];
            var d = Cc(c, b);
            if (d) throw new R(d);
            if (!c.ca.Aa) throw new R(63);
            c.ca.Aa(c, b, a);
        }
        function Sa(a, b, c = 438) {
            if ("" === a) throw new R(44);
            if ("string" == typeof b) {
                var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
                if ("undefined" == typeof d)
                    throw Error(`Unknown file open mode: ${b}`);
                b = d;
            }
            c = b & 64 ? (c & 4095) | 32768 : 0;
            if ("object" == typeof a) d = a;
            else {
                var e = a.endsWith("/");
                var f = U(a, { Da: !(b & 131072), cb: !0 });
                d = f.node;
                a = f.path;
            }
            f = !1;
            if (b & 64)
                if (d) {
                    if (b & 128) throw new R(20);
                } else {
                    if (e) throw new R(31);
                    d = Hc(a, c | 511, 0);
                    f = !0;
                }
            if (!d) throw new R(44);
            8192 === (d.mode & 61440) && (b &= -513);
            if (b & 65536 && 16384 !== (d.mode & 61440)) throw new R(54);
            if (
                !f &&
                (e = d
                    ? 40960 === (d.mode & 61440)
                        ? 32
                        : 16384 === (d.mode & 61440) && ("r" !== Bc(b) || b & 576)
                            ? 31
                            : Ac(d, Bc(b))
                    : 44)
            )
                throw new R(e);
            if (b & 512 && !f) {
                e = d;
                e = "string" == typeof e ? U(e, { Da: !0 }).node : e;
                if (16384 === (e.mode & 61440)) throw new R(31);
                if (32768 !== (e.mode & 61440)) throw new R(28);
                if ((a = Ac(e, "w"))) throw new R(a);
                Fc(e, { size: 0, timestamp: Date.now() });
            }
            a: for (e = d; ;) {
                if (e === e.parent) {
                    e = e.ma.Oa;
                    var g = g ? ("/" !== e[e.length - 1] ? `${e}/${g}` : e + g) : e;
                    break a;
                }
                g = g ? `${e.name}/${g}` : e.name;
                e = e.parent;
            }
            b = Dc({
                node: d,
                path: g,
                flags: b & -131713,
                seekable: !0,
                position: 0,
                aa: d.aa,
                hb: [],
                error: !1,
            });
            b.aa.open && b.aa.open(b);
            f &&
                ((c &= 511),
                    (d = "string" == typeof d ? U(d, { Da: !0 }).node : d),
                    Fc(d, {
                        mode: (c & 4095) | (d.mode & -4096),
                        fa: Date.now(),
                        tb: void 0,
                    }));
            return b;
        }
        function Rb(a) {
            if (null === a.pa) throw new R(8);
            a.Fa && (a.Fa = null);
            try {
                a.aa.close && a.aa.close(a);
            } catch (b) {
                throw b;
            } finally {
                M[a.pa] = null;
            }
            a.pa = null;
        }
        function Jc(a, b, c) {
            if (null === a.pa) throw new R(8);
            if (!a.seekable || !a.aa.ha) throw new R(70);
            if (0 != c && 1 != c && 2 != c) throw new R(28);
            a.position = a.aa.ha(a, b, c);
            a.hb = [];
        }
        function X(a, b) {
            a = dc("/dev/" + a);
            var c = uc(!!b);
            X.Ma ?? (X.Ma = 64);
            var d = (X.Ma++ << 8) | 0;
            mc(d, {
                open(e) {
                    e.seekable = !1;
                },
                close() {
                    (void 0)?.buffer?.length && (void 0)(10);
                },
                read(e, f, g, m) {
                    for (var r = 0, n = 0; n < m; n++) {
                        try {
                            var y = b();
                        } catch (ta) {
                            throw new R(29);
                        }
                        if (void 0 === y && 0 === r) throw new R(6);
                        if (null === y || void 0 === y) break;
                        r++;
                        f[g + n] = y;
                    }
                    r && (e.node.ra = Date.now());
                    return r;
                },
                write(e, f, g, m) {
                    for (var r = 0; r < m; r++)
                        try {
                            (void 0)(f[g + r]);
                        } catch (n) {
                            throw new R(29);
                        }
                    m && (e.node.ga = e.node.fa = Date.now());
                    return r;
                },
            });
            Ic(a, c, d);
        }
        var Y = {},
            ja = (a, b) => (a ? P(pa(), a, b) : ""),
            N = void 0;
        function cb(a, b, c) {
            if (l) return L(3, 1, a, b, c);
            N = c;
            try {
                var d = V(a);
                switch (b) {
                    case 0:
                        var e = O();
                        if (0 > e) break;
                        for (; M[e];) e++;
                        return Ec(d, e).pa;
                    case 1:
                    case 2:
                        return 0;
                    case 3:
                        return d.flags;
                    case 4:
                        return ((e = O()), (d.flags |= e), 0);
                    case 12:
                        return ((e = O()), (Ea()[(e + 0) >> 1] = 2), 0);
                    case 13:
                    case 14:
                        return 0;
                }
                return -28;
            } catch (f) {
                if ("undefined" == typeof Y || "ErrnoError" !== f.name) throw f;
                return -f.oa;
            }
        }
        function db(a, b, c) {
            if (l) return L(4, 1, a, b, c);
            N = c;
            try {
                var d = V(a);
                switch (b) {
                    case 21509:
                        return d.da ? 0 : -59;
                    case 21505:
                        if (!d.da) return -59;
                        if (d.da.na.Za) {
                            a = [
                                3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0,
                                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            ];
                            var e = O();
                            A()[e >> 2] = 25856;
                            A()[(e + 4) >> 2] = 5;
                            A()[(e + 8) >> 2] = 191;
                            A()[(e + 12) >> 2] = 35387;
                            for (var f = 0; 32 > f; f++) x()[e + f + 17] = a[f] || 0;
                        }
                        return 0;
                    case 21510:
                    case 21511:
                    case 21512:
                        return d.da ? 0 : -59;
                    case 21506:
                    case 21507:
                    case 21508:
                        if (!d.da) return -59;
                        if (d.da.na.$a)
                            for (e = O(), A(), A(), A(), A(), a = [], f = 0; 32 > f; f++)
                                a.push(x()[e + f + 17]);
                        return 0;
                    case 21519:
                        if (!d.da) return -59;
                        e = O();
                        return (A()[e >> 2] = 0);
                    case 21520:
                        return d.da ? -28 : -59;
                    case 21531:
                        e = O();
                        if (!d.aa.Ya) throw new R(59);
                        return d.aa.Ya(d, b, e);
                    case 21523:
                        if (!d.da) return -59;
                        d.da.na.ab &&
                            ((f = [24, 80]),
                                (e = O()),
                                (Ea()[e >> 1] = f[0]),
                                (Ea()[(e + 2) >> 1] = f[1]));
                        return 0;
                    case 21524:
                        return d.da ? 0 : -59;
                    case 21515:
                        return d.da ? 0 : -59;
                    default:
                        return -28;
                }
            } catch (g) {
                if ("undefined" == typeof Y || "ErrnoError" !== g.name) throw g;
                return -g.oa;
            }
        }
        function eb(a, b, c, d) {
            if (l) return L(5, 1, a, b, c, d);
            N = d;
            try {
                b = ja(b);
                var e = b;
                if ("/" === e.charAt(0)) b = e;
                else {
                    var f = -100 === a ? "/" : V(a).path;
                    if (0 == e.length) throw new R(44);
                    b = f + "/" + e;
                }
                var g = d ? O() : 0;
                return Sa(b, c, g).pa;
            } catch (m) {
                if ("undefined" == typeof Y || "ErrnoError" !== m.name) throw m;
                return -m.oa;
            }
        }
        var fb = () => Va(""),
            gb = (a) => {
                Ja(a, !k, 1, !ia, 3145728, !1);
                Ka();
            },
            Kc = (a) => {
                if (!(a instanceof Db || "unwind" == a)) throw a;
            },
            Lc = (a) => {
                if (!Da && !xa)
                    try {
                        if ((a(), !(Da || 0 < K)))
                            try {
                                l ? ac(u) : xb(u);
                            } catch (b) {
                                Kc(b);
                            }
                    } catch (b) {
                        Kc(b);
                    }
            },
            La = (a) => {
                "function" === typeof Atomics.ib &&
                    (Atomics.ib(A(), a >> 2, a).value.then(Na),
                        (a += 128),
                        Atomics.store(A(), a >> 2, 1));
            },
            Na = () => {
                var a = Xb();
                a && (La(a), Lc(Mc));
            },
            hb = (a, b) => {
                a == b
                    ? setTimeout(Na)
                    : l
                        ? postMessage({ Ba: a, la: "checkMailbox" })
                        : (a = J[a]) && a.postMessage({ la: "checkMailbox" });
            },
            Nc = [],
            ib = (a, b, c, d, e) => {
                d /= 2;
                Nc.length = d;
                b = e >> 3;
                for (c = 0; c < d; c++)
                    Nc[c] = w[b + 2 * c] ? w[b + 2 * c + 1] : Fa()[b + 2 * c + 1];
                return (0, Oc[a])(...Nc);
            },
            jb = () => {
                K = 0;
            },
            kb = (a) => {
                l ? postMessage({ la: "cleanupThread", gb: a }) : Wb(J[a]);
            },
            lb = () => { },
            Pc = {},
            rb = () => performance.timeOrigin + performance.now();
        function mb(a, b) {
            if (l) return L(6, 1, a, b);
            Pc[a] && (clearTimeout(Pc[a].id), delete Pc[a]);
            if (!b) return 0;
            var c = setTimeout(() => {
                delete Pc[a];
                Lc(() => Qc(a, performance.timeOrigin + performance.now()));
            }, b);
            Pc[a] = { id: c, Bb: b };
            return 0;
        }
        var Z = (a, b, c) => oa(a, pa(), b, c),
            nb = (a, b, c, d) => {
                var e = new Date().getFullYear(),
                    f = new Date(e, 0, 1).getTimezoneOffset();
                e = new Date(e, 6, 1).getTimezoneOffset();
                var g = Math.max(f, e);
                B()[a >> 2] = 60 * g;
                A()[b >> 2] = Number(f != e);
                b = (m) => {
                    var r = Math.abs(m);
                    return `UTC${0 <= m ? "-" : "+"}${String(Math.floor(r / 60)).padStart(2, "0")}${String(r % 60).padStart(2, "0")}`;
                };
                a = b(f);
                b = b(e);
                e < f ? (Z(a, c, 17), Z(b, d, 17)) : (Z(a, d, 17), Z(b, c, 17));
            },
            Rc = 1;
        function ob(a, b, c) {
            if (!(0 <= a && 3 >= a)) return 28;
            if (0 === a) a = Date.now();
            else if (Rc) a = performance.timeOrigin + performance.now();
            else return 52;
            w[c >> 3] = BigInt(Math.round(1e6 * a));
            return 0;
        }
        var Sc = () => {
            Sc.Ia || (Sc.Ia = {});
            Sc.Ia[
                "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"
            ] ||
                ((Sc.Ia[
                    "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"
                ] = 1),
                    q(
                        "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread",
                    ));
        },
            pb = () => {
                k ||
                    (Sc(),
                        Va(
                            "Blocking on the main thread is not allowed by default. See https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread",
                        ));
            },
            qb = () => {
                K += 1;
                throw "unwind";
            },
            sb = () => navigator.hardwareConcurrency,
            tb = (a) => {
                var b = pa().length;
                a >>>= 0;
                if (a <= b || 2147483648 < a) return !1;
                for (var c = 1; 4 >= c; c *= 2) {
                    var d = b * (1 + 0.2 / c);
                    d = Math.min(d, a + 100663296);
                    a: {
                        d =
                            ((Math.min(
                                2147483648,
                                65536 * Math.ceil(Math.max(a, d) / 65536),
                            ) -
                                t.buffer.byteLength +
                                65535) /
                                65536) |
                            0;
                        try {
                            t.grow(d);
                            z();
                            var e = 1;
                            break a;
                        } catch (f) { }
                        e = void 0;
                    }
                    if (e) return !0;
                }
                return !1;
            },
            Tc = {},
            Vc = () => {
                if (!Uc) {
                    var a = {
                        USER: "web_user",
                        LOGNAME: "web_user",
                        PATH: "/",
                        PWD: "/",
                        HOME: "/home/web_user",
                        LANG:
                            (
                                ("object" == typeof navigator &&
                                    navigator.languages &&
                                    navigator.languages[0]) ||
                                "C"
                            ).replace("-", "_") + ".UTF-8",
                        _: "./this.program",
                    },
                        b;
                    for (b in Tc) void 0 === Tc[b] ? delete a[b] : (a[b] = Tc[b]);
                    var c = [];
                    for (b in a) c.push(`${b}=${a[b]}`);
                    Uc = c;
                }
                return Uc;
            },
            Uc;
        function vb(a, b) {
            if (l) return L(7, 1, a, b);
            var c = 0,
                d = 0,
                e;
            for (e of Vc()) {
                var f = b + c;
                B()[(a + d) >> 2] = f;
                c += Z(e, f, Infinity) + 1;
                d += 4;
            }
            return 0;
        }
        function wb(a, b) {
            if (l) return L(8, 1, a, b);
            var c = Vc();
            B()[a >> 2] = c.length;
            a = 0;
            for (var d of c) a += na(d) + 1;
            B()[b >> 2] = a;
            return 0;
        }
        function yb(a) {
            if (l) return L(9, 1, a);
            try {
                var b = V(a);
                Rb(b);
                return 0;
            } catch (c) {
                if ("undefined" == typeof Y || "ErrnoError" !== c.name) throw c;
                return c.oa;
            }
        }
        function zb(a, b, c, d) {
            if (l) return L(10, 1, a, b, c, d);
            try {
                a: {
                    var e = V(a);
                    a = b;
                    for (var f, g = (b = 0); g < c; g++) {
                        var m = B()[a >> 2],
                            r = B()[(a + 4) >> 2];
                        a += 8;
                        var n = e,
                            y = x(),
                            ta = m,
                            ca = r,
                            E = f;
                        if (0 > ca || 0 > E) throw new R(28);
                        if (null === n.pa) throw new R(8);
                        if (1 === (n.flags & 2097155)) throw new R(8);
                        if (16384 === (n.node.mode & 61440)) throw new R(31);
                        if (!n.aa.read) throw new R(28);
                        var da = "undefined" != typeof E;
                        if (!da) E = n.position;
                        else if (!n.seekable) throw new R(70);
                        var ea = n.aa.read(n, y, ta, ca, E);
                        da || (n.position += ea);
                        var F = ea;
                        if (0 > F) {
                            var fa = -1;
                            break a;
                        }
                        b += F;
                        if (F < r) break;
                        "undefined" != typeof f && (f += F);
                    }
                    fa = b;
                }
                B()[d >> 2] = fa;
                return 0;
            } catch (Q) {
                if ("undefined" == typeof Y || "ErrnoError" !== Q.name) throw Q;
                return Q.oa;
            }
        }
        function Ab(a, b, c, d) {
            if (l) return L(11, 1, a, b, c, d);
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
                if (isNaN(b)) return 61;
                var e = V(a);
                Jc(e, b, c);
                w[d >> 3] = BigInt(e.position);
                e.Fa && 0 === b && 0 === c && (e.Fa = null);
                return 0;
            } catch (f) {
                if ("undefined" == typeof Y || "ErrnoError" !== f.name) throw f;
                return f.oa;
            }
        }
        function Bb(a, b, c, d) {
            if (l) return L(12, 1, a, b, c, d);
            try {
                a: {
                    var e = V(a);
                    a = b;
                    for (var f, g = (b = 0); g < c; g++) {
                        var m = B()[a >> 2],
                            r = B()[(a + 4) >> 2];
                        a += 8;
                        var n = e,
                            y = x(),
                            ta = m,
                            ca = r,
                            E = f;
                        if (0 > ca || 0 > E) throw new R(28);
                        if (null === n.pa) throw new R(8);
                        if (0 === (n.flags & 2097155)) throw new R(8);
                        if (16384 === (n.node.mode & 61440)) throw new R(31);
                        if (!n.aa.write) throw new R(28);
                        n.seekable && n.flags & 1024 && Jc(n, 0, 2);
                        var da = "undefined" != typeof E;
                        if (!da) E = n.position;
                        else if (!n.seekable) throw new R(70);
                        var ea = n.aa.write(n, y, ta, ca, E, void 0);
                        da || (n.position += ea);
                        var F = ea;
                        if (0 > F) {
                            var fa = -1;
                            break a;
                        }
                        b += F;
                        if (F < r) break;
                        "undefined" != typeof f && (f += F);
                    }
                    fa = b;
                }
                B()[d >> 2] = fa;
                return 0;
            } catch (Q) {
                if ("undefined" == typeof Y || "ErrnoError" !== Q.name) throw Q;
                return Q.oa;
            }
        }
        l || Tb();
        T = Array(4096);
        Gc(S, "/");
        W("/tmp");
        W("/home");
        W("/home/web_user");
        (function () {
            W("/dev");
            mc(259, { read: () => 0, write: (d, e, f, g) => g, ha: () => 0 });
            Ic("/dev/null", 259);
            lc(1280, oc);
            lc(1536, pc);
            Ic("/dev/tty", 1280);
            Ic("/dev/tty1", 1536);
            var a = new Uint8Array(1024),
                b = 0,
                c = () => {
                    0 === b && (gc(a), (b = a.byteLength));
                    return a[--b];
                };
            X("random", c);
            X("urandom", c);
            W("/dev/shm");
            W("/dev/shm/tmp");
        })();
        (function () {
            W("/proc");
            var a = W("/proc/self");
            W("/proc/self/fd");
            Gc(
                {
                    ma() {
                        var b = rc(a, "fd", 16895, 73);
                        b.aa = { ha: S.aa.ha };
                        b.ca = {
                            ta(c, d) {
                                c = +d;
                                var e = V(c);
                                c = {
                                    parent: null,
                                    ma: { Oa: "fake" },
                                    ca: { ua: () => e.path },
                                    id: c + 1,
                                };
                                return (c.parent = c);
                            },
                            Ha() {
                                return Array.from(M.entries())
                                    .filter(([, c]) => c)
                                    .map(([c]) => c.toString());
                            },
                        };
                        return b;
                    },
                },
                "/proc/self/fd",
            );
        })();
        S.Ka = new R(44);
        S.Ka.stack = "<generic error, no stack>";
        l ||
            (h.wasmMemory
                ? (t = h.wasmMemory)
                : (t = new WebAssembly.Memory({
                    initial: 1024,
                    maximum: 32768,
                    shared: !0,
                })),
                z());
        h.print && (va = h.print);
        h.printErr && (q = h.printErr);
        h.UTF8ToString = ja;
        h.stringToUTF8 = Z;
        var Oc = [Cb, Ob, bc, cb, db, eb, mb, vb, wb, yb, zb, Ab, Bb],
            ab,
            C = await (async function () {
                function a(d, e) {
                    C = d.exports;
                    Sb.push(C.K);
                    $b = C.N;
                    wa = e;
                    Ua();
                    return C;
                }
                D++;
                var b = $a();
                if (h.instantiateWasm)
                    return new Promise((d) => {
                        h.instantiateWasm(b, (e, f) => {
                            d(a(e, f));
                        });
                    });
                if (l)
                    return new Promise((d) => {
                        Ga = (e) => {
                            var f = new WebAssembly.Instance(e, $a());
                            d(a(f, e));
                        };
                    });
                Wa ??= h.locateFile
                    ? h.locateFile
                        ? h.locateFile("sf171-79.wasm", p)
                        : p + "sf171-79.wasm"
                    : new URL("sf171-79.wasm", import.meta.url).href;
                try {
                    var c = await Za(b);
                    return a(c.instance, c.module);
                } catch (d) {
                    return (ba(d), Promise.reject(d));
                }
            })();
        h._main = (a, b) => (h._main = C.F)(a, b);
        h.__Z10js_getlinev = (a) => (h.__Z10js_getlinev = C.G)(a);
        var qa = (h._uci = (a) => (qa = h._uci = C.H)(a)),
            ma = (h._setNnueBuffer = (a, b, c) =>
                (ma = h._setNnueBuffer = C.I)(a, b, c)),
            ka = (h._getRecommendedNnue = (a) =>
                (ka = h._getRecommendedNnue = C.J)(a)),
            Xb = () => (Xb = C.L)(),
            Wc = (h.__emscripten_proxy_main = (a, b) =>
                (Wc = h.__emscripten_proxy_main = C.M)(a, b)),
            Pb = () => (Pb = C.O)(),
            Ja = (a, b, c, d, e, f) => (Ja = C.P)(a, b, c, d, e, f),
            Oa = () => (Oa = C.Q)(),
            Qb = (a) => (Qb = C.R)(a),
            la = (h._malloc = (a) => (la = h._malloc = C.S)(a)),
            Lb = (a, b, c, d, e) => (Lb = C.T)(a, b, c, d, e),
            Vb = (a) => (Vb = C.U)(a),
            ac = (a) => (ac = C.V)(a),
            Qc = (a, b) => (Qc = C.W)(a, b),
            Mc = () => (Mc = C.X)(),
            Yb = (a, b) => (Yb = C.Y)(a, b),
            Mb = (a) => (Mb = C.Z)(a),
            Kb = (a) => (Kb = C._)(a),
            Jb = () => (Jb = C.$)();
        function Xc(a = []) {
            var b = Wc;
            K += 1;
            a.unshift("./this.program");
            var c = a.length,
                d = Kb(4 * (c + 1)),
                e = d;
            a.forEach((g) => {
                var m = B(),
                    r = e >> 2,
                    n = na(g) + 1,
                    y = Kb(n);
                Z(g, y, n);
                m[r] = y;
                e += 4;
            });
            B()[e >> 2] = 0;
            try {
                var f = b(c, d);
                xb(f, !0);
            } catch (g) {
                Kc(g);
            }
        }
        function Yc(a = ra) {
            if (0 < D) G = Yc;
            else if (l) (aa(h), Pa());
            else {
                for (; 0 < Fb.length;) Fb.shift()(h);
                0 < D ? (G = Yc) : ((h.calledRun = !0), xa || (Pa(), aa(h), Xc(a)));
            }
        }
        Yc();
        moduleRtn = ha;

        return moduleRtn;
    };
})();
export default Sf17179Web;
var isPthread = globalThis.self?.name?.startsWith("em-pthread");
// When running as a pthread, construct a new instance on startup
isPthread && Sf17179Web();
