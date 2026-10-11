"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value2) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value2 }) : obj[key] = value2;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod2) => function __require() {
    try {
      return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
    } catch (e) {
      throw mod2 = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);
  var __publicField = (obj, key, value2) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value2);

  // node_modules/bech32/dist/index.js
  var require_dist = __commonJS({
    "node_modules/bech32/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.bech32m = exports.bech32 = void 0;
      var ALPHABET2 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      var ALPHABET_MAP = {};
      for (let z = 0; z < ALPHABET2.length; z++) {
        const x = ALPHABET2.charAt(z);
        ALPHABET_MAP[x] = z;
      }
      function polymodStep(pre) {
        const b = pre >> 25;
        return (pre & 33554431) << 5 ^ -(b >> 0 & 1) & 996825010 ^ -(b >> 1 & 1) & 642813549 ^ -(b >> 2 & 1) & 513874426 ^ -(b >> 3 & 1) & 1027748829 ^ -(b >> 4 & 1) & 705979059;
      }
      function prefixChk(prefix) {
        let chk = 1;
        for (let i = 0; i < prefix.length; ++i) {
          const c = prefix.charCodeAt(i);
          if (c < 33 || c > 126)
            return "Invalid prefix (" + prefix + ")";
          chk = polymodStep(chk) ^ c >> 5;
        }
        chk = polymodStep(chk);
        for (let i = 0; i < prefix.length; ++i) {
          const v = prefix.charCodeAt(i);
          chk = polymodStep(chk) ^ v & 31;
        }
        return chk;
      }
      function convert(data, inBits, outBits, pad) {
        let value2 = 0;
        let bits = 0;
        const maxV = (1 << outBits) - 1;
        const result = [];
        for (let i = 0; i < data.length; ++i) {
          value2 = value2 << inBits | data[i];
          bits += inBits;
          while (bits >= outBits) {
            bits -= outBits;
            result.push(value2 >> bits & maxV);
          }
        }
        if (pad) {
          if (bits > 0) {
            result.push(value2 << outBits - bits & maxV);
          }
        } else {
          if (bits >= inBits)
            return "Excess padding";
          if (value2 << outBits - bits & maxV)
            return "Non-zero padding";
        }
        return result;
      }
      function toWords(bytes) {
        return convert(bytes, 8, 5, true);
      }
      function fromWordsUnsafe(words) {
        const res = convert(words, 5, 8, false);
        if (Array.isArray(res))
          return res;
      }
      function fromWords(words) {
        const res = convert(words, 5, 8, false);
        if (Array.isArray(res))
          return res;
        throw new Error(res);
      }
      function getLibraryFromEncoding(encoding) {
        let ENCODING_CONST;
        if (encoding === "bech32") {
          ENCODING_CONST = 1;
        } else {
          ENCODING_CONST = 734539939;
        }
        function encode21(prefix, words, LIMIT) {
          LIMIT = LIMIT || 90;
          if (prefix.length + 7 + words.length > LIMIT)
            throw new TypeError("Exceeds length limit");
          prefix = prefix.toLowerCase();
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            throw new Error(chk);
          let result = prefix + "1";
          for (let i = 0; i < words.length; ++i) {
            const x = words[i];
            if (x >> 5 !== 0)
              throw new Error("Non 5-bit word");
            chk = polymodStep(chk) ^ x;
            result += ALPHABET2.charAt(x);
          }
          for (let i = 0; i < 6; ++i) {
            chk = polymodStep(chk);
          }
          chk ^= ENCODING_CONST;
          for (let i = 0; i < 6; ++i) {
            const v = chk >> (5 - i) * 5 & 31;
            result += ALPHABET2.charAt(v);
          }
          return result;
        }
        function __decode(str, LIMIT) {
          LIMIT = LIMIT || 90;
          if (str.length < 8)
            return str + " too short";
          if (str.length > LIMIT)
            return "Exceeds length limit";
          const lowered = str.toLowerCase();
          const uppered = str.toUpperCase();
          if (str !== lowered && str !== uppered)
            return "Mixed-case string " + str;
          str = lowered;
          const split = str.lastIndexOf("1");
          if (split === -1)
            return "No separator character for " + str;
          if (split === 0)
            return "Missing prefix for " + str;
          const prefix = str.slice(0, split);
          const wordChars = str.slice(split + 1);
          if (wordChars.length < 6)
            return "Data too short";
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            return chk;
          const words = [];
          for (let i = 0; i < wordChars.length; ++i) {
            const c = wordChars.charAt(i);
            const v = ALPHABET_MAP[c];
            if (v === void 0)
              return "Unknown character " + c;
            chk = polymodStep(chk) ^ v;
            if (i + 6 >= wordChars.length)
              continue;
            words.push(v);
          }
          if (chk !== ENCODING_CONST)
            return "Invalid checksum for " + str;
          return { prefix, words };
        }
        function decodeUnsafe(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
        }
        function decode20(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
          throw new Error(res);
        }
        return {
          decodeUnsafe,
          decode: decode20,
          encode: encode21,
          toWords,
          fromWordsUnsafe,
          fromWords
        };
      }
      exports.bech32 = getLibraryFromEncoding("bech32");
      exports.bech32m = getLibraryFromEncoding("bech32m");
    }
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/_u64.js
  function setU64FromNum(view, byteOffset, n, isLE) {
    const h2 = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE ? l : h2, isLE);
    view.setUint32(byteOffset + 4, isLE ? h2 : l, isLE);
  }
  var fromNumH, fromNumL;
  var init_u64 = __esm({
    "node_modules/@noble/curves/node_modules/@noble/hashes/_u64.js"() {
      fromNumH = (n) => n / 2 ** 32 | 0;
      fromNumL = (n) => n >>> 0;
    }
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/utils.js
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes2(value2, length2, title = "") {
    if (isBytes2(value2) && (length2 === void 0 || value2.length === length2))
      return value2;
    if (length2 !== void 0)
      anumber(length2, "length");
    const bytes = isBytes2(value2);
    const ofLen = length2 !== void 0 ? ` of length ${length2}` : "";
    const got = bytes ? `length=${value2.length}` : `type=${typeof value2}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function ahash(h2) {
    if (typeof h2 !== "function" || typeof h2.create !== "function")
      throw new TypeError("expected hash wrapped by utils.createHasher");
    anumber(h2.outputLen);
    anumber(h2.blockLen);
    if (h2.outputLen < 1 || h2.blockLen < 1)
      throw new Error("hash blockLen / outputLen must be >= 1");
  }
  function aexists2(instance2, checkFinished = true) {
    if (instance2.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance2.finished)
      throw new Error("digest() was already called");
  }
  function aoutput2(out, instance2) {
    abytes2(out, void 0, "output");
    const min = instance2.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function clean2(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView2(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr2(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function bytesToHex(bytes) {
    abytes2(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
  }
  function hexToBytes(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    if (hasHexBuiltin) {
      try {
        return Uint8Array.fromHex(hex);
      } catch (error) {
        if (error instanceof SyntaxError)
          throw new RangeError(error.message);
        throw error;
      }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      throw new RangeError("hex string expected, got unpadded hex of length " + hl);
    const array2 = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array2[ai] = n1 * 16 + n2;
    }
    return array2;
  }
  function utf8ToBytes2(str) {
    if (typeof str !== "string")
      throw new TypeError("string expected");
    const encoded = new TextEncoder().encode(str);
    try {
      return new Uint8Array(encoded);
    } finally {
      clean2(encoded);
    }
  }
  function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes2(a);
      sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
      const a = arrays[i];
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  }
  function checkOpts(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher2(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  function randomBytes(bytesLength = 32) {
    anumber(bytesLength, "bytesLength");
    const cr = typeof globalThis === "object" ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined");
    if (bytesLength > 65536)
      throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
  }
  var atitle, aobject, aopts, hasHexBuiltin, hexes, oidNist;
  var init_utils = __esm({
    "node_modules/@noble/curves/node_modules/@noble/hashes/utils.js"() {
      atitle = (title) => title ? `"${title}" ` : "";
      aobject = (value2, label) => {
        if (value2 === null || typeof value2 !== "object" || Array.isArray(value2))
          throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value2);
      };
      aopts = (value2, label) => {
        aobject(value2, label);
        const proto = Object.getPrototypeOf(value2);
        if (proto !== Object.prototype && proto !== null)
          throw new TypeError(`"${label}" expected plain object`);
        if (Object.hasOwn(value2, "__proto__"))
          throw new TypeError(`"${label}.__proto__" is not allowed`);
      };
      hasHexBuiltin = /* @__PURE__ */ (() => (
        // @ts-ignore
        typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
      ))();
      hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
      oidNist = (suffix) => ({
        // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
        // Larger suffix values would need base-128 OID encoding and a different length byte.
        oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
      });
    }
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/_md.js
  function Chi2(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj2(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD2, SHA256_IV2;
  var init_md = __esm({
    "node_modules/@noble/curves/node_modules/@noble/hashes/_md.js"() {
      init_u64();
      init_utils();
      HashMD2 = class {
        constructor(blockLen, outputLen, padOffset, isLE) {
          __publicField(this, "blockLen");
          __publicField(this, "outputLen");
          __publicField(this, "canXOF", false);
          __publicField(this, "padOffset");
          __publicField(this, "isLE");
          // For partial updates less than block size
          __publicField(this, "buffer");
          __publicField(this, "view");
          __publicField(this, "finished", false);
          __publicField(this, "length", 0);
          __publicField(this, "pos", 0);
          __publicField(this, "destroyed", false);
          this.blockLen = blockLen;
          this.outputLen = outputLen;
          this.padOffset = padOffset;
          this.isLE = isLE;
          this.buffer = new Uint8Array(blockLen);
          this.view = createView2(this.buffer);
        }
        update(data) {
          aexists2(this);
          abytes2(data);
          const { view, buffer, blockLen } = this;
          const len = data.length;
          let processed = false;
          for (let pos = 0; pos < len; ) {
            const take = Math.min(blockLen - this.pos, len - pos);
            if (take === blockLen) {
              const dataView = createView2(data);
              for (; blockLen <= len - pos; pos += blockLen)
                this.process(dataView, pos);
              processed = true;
              continue;
            }
            buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
              this.process(view, 0);
              this.pos = 0;
              processed = true;
            }
          }
          this.length += data.length;
          if (processed)
            this.roundClean();
          return this;
        }
        digestInto(out) {
          aexists2(this);
          aoutput2(out, this);
          this.finished = true;
          const { buffer, view, blockLen, isLE } = this;
          let { pos } = this;
          buffer[pos++] = 128;
          buffer.fill(0, pos);
          if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            buffer.fill(0);
          }
          setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
          this.process(view, 0);
          this.roundClean();
          const oview = out === buffer ? view : createView2(out);
          const len = this.outputLen;
          const outLen = len / 4;
          const state = this.get();
          if (len % 4 || outLen > state.length)
            throw new Error("invalid outputLen");
          for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
        }
        digest() {
          const { buffer, outputLen } = this;
          this.digestInto(buffer);
          const res = buffer.slice(0, outputLen);
          this.destroy();
          return res;
        }
        _cloneIntoMeta(to) {
          const { buffer, length: length2, finished, destroyed, pos } = this;
          to.destroyed = destroyed;
          to.finished = finished;
          to.length = length2;
          to.pos = pos;
          if (pos)
            to.buffer.set(buffer);
          return to;
        }
        clone() {
          return this._cloneInto();
        }
      };
      SHA256_IV2 = /* @__PURE__ */ Uint32Array.from([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
    }
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/sha2.js
  var SHA256_K2, SHA256_W2, SHA2_32B, _SHA256, sha2563;
  var init_sha2 = __esm({
    "node_modules/@noble/curves/node_modules/@noble/hashes/sha2.js"() {
      init_md();
      init_utils();
      SHA256_K2 = /* @__PURE__ */ Uint32Array.from([
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ]);
      SHA256_W2 = /* @__PURE__ */ new Uint32Array(64);
      SHA2_32B = class extends HashMD2 {
        constructor(outputLen, IV) {
          super(64, outputLen, 8, false);
          // We cannot use array here since array allows indexing by variable
          // which means optimizer/compiler cannot use registers.
          // Numeric initializers matter: starting the fields as `undefined` changes
          // V8's field representation and makes sha256 3x slower (measured).
          __publicField(this, "A", 0);
          __publicField(this, "B", 0);
          __publicField(this, "C", 0);
          __publicField(this, "D", 0);
          __publicField(this, "E", 0);
          __publicField(this, "F", 0);
          __publicField(this, "G", 0);
          __publicField(this, "H", 0);
          this.A = IV[0] | 0;
          this.B = IV[1] | 0;
          this.C = IV[2] | 0;
          this.D = IV[3] | 0;
          this.E = IV[4] | 0;
          this.F = IV[5] | 0;
          this.G = IV[6] | 0;
          this.H = IV[7] | 0;
        }
        get() {
          const { A, B, C, D, E, F, G, H } = this;
          return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
          this.A = A | 0;
          this.B = B | 0;
          this.C = C | 0;
          this.D = D | 0;
          this.E = E | 0;
          this.F = F | 0;
          this.G = G | 0;
          this.H = H | 0;
        }
        _cloneInto(to) {
          (to || (to = new this.constructor())).set(...this.get());
          return this._cloneIntoMeta(to);
        }
        process(view, offset) {
          for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W2[i] = view.getUint32(offset, false);
          for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W2[i - 15];
            const W2 = SHA256_W2[i - 2];
            const s0 = rotr2(W15, 7) ^ rotr2(W15, 18) ^ W15 >>> 3;
            const s1 = rotr2(W2, 17) ^ rotr2(W2, 19) ^ W2 >>> 10;
            SHA256_W2[i] = s1 + SHA256_W2[i - 7] + s0 + SHA256_W2[i - 16] | 0;
          }
          let { A, B, C, D, E, F, G, H } = this;
          for (let i = 0; i < 64; i++) {
            const sigma1 = rotr2(E, 6) ^ rotr2(E, 11) ^ rotr2(E, 25);
            const T1 = H + sigma1 + Chi2(E, F, G) + SHA256_K2[i] + SHA256_W2[i] | 0;
            const sigma0 = rotr2(A, 2) ^ rotr2(A, 13) ^ rotr2(A, 22);
            const T2 = sigma0 + Maj2(A, B, C) | 0;
            H = G;
            G = F;
            F = E;
            E = D + T1 | 0;
            D = C;
            C = B;
            B = A;
            A = T1 + T2 | 0;
          }
          A = A + this.A | 0;
          B = B + this.B | 0;
          C = C + this.C | 0;
          D = D + this.D | 0;
          E = E + this.E | 0;
          F = F + this.F | 0;
          G = G + this.G | 0;
          H = H + this.H | 0;
          this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
          clean2(SHA256_W2);
        }
        destroy() {
          this.destroyed = true;
          this.set(0, 0, 0, 0, 0, 0, 0, 0);
          clean2(this.buffer);
        }
      };
      _SHA256 = class extends SHA2_32B {
        constructor() {
          super(32, SHA256_IV2);
        }
      };
      sha2563 = /* @__PURE__ */ createHasher2(
        () => new _SHA256(),
        /* @__PURE__ */ oidNist(1)
      );
    }
  });

  // node_modules/@noble/curves/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    aInRange: () => aInRange,
    aarray: () => aarray,
    abignumber: () => abignumber,
    abool: () => abool,
    abytes: () => abytes3,
    afunction: () => afunction,
    anumber: () => anumber2,
    aobject: () => aobject2,
    asafenumber: () => asafenumber,
    asciiToBytes: () => asciiToBytes,
    astring: () => astring,
    bitGet: () => bitGet,
    bitLen: () => bitLen,
    bitMask: () => bitMask,
    bitSet: () => bitSet,
    bytesToHex: () => bytesToHex2,
    bytesToNumberBE: () => bytesToNumberBE,
    bytesToNumberLE: () => bytesToNumberLE,
    concatBytes: () => concatBytes2,
    copyBytes: () => copyBytes,
    createHmacDrbg: () => createHmacDrbg,
    equalBytes: () => equalBytes,
    hexToBytes: () => hexToBytes2,
    hexToNumber: () => hexToNumber,
    inRange: () => inRange,
    isBytes: () => isBytes3,
    isPosBig: () => isPosBig,
    notImplemented: () => notImplemented,
    numberToBytesBE: () => numberToBytesBE,
    numberToBytesLE: () => numberToBytesLE,
    numberToHexUnpadded: () => numberToHexUnpadded,
    numberToVarBytesBE: () => numberToVarBytesBE,
    randomBytes: () => randomBytes2,
    validateObject: () => validateObject
  });
  function aarray(item, title, inner = () => {
  }) {
    if (!Array.isArray(item))
      throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for (let i = 0; i < item.length; i++)
      inner(item[i], `${title}[${i}]`);
    return item;
  }
  function astring(value2, title = "") {
    if (typeof value2 !== "string") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected string, got type=" + typeof value2);
    }
    return value2;
  }
  function aobject2(value2, title = "object") {
    if (value2 === null || typeof value2 !== "object" || Array.isArray(value2))
      throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value2}`);
    return value2;
  }
  function afunction(value2, title) {
    if (typeof value2 !== "function")
      throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value2}`);
    return value2;
  }
  function abool(value2, title = "") {
    if (typeof value2 !== "boolean")
      throw new TypeError(atitle2(title) + "expected boolean, got type=" + typeof value2);
    return value2;
  }
  function abignumber(n) {
    if (typeof n === "bigint") {
      if (!isPosBig(n))
        throw new RangeError("positive bigint expected, got " + n);
    } else
      anumber2(n);
    return n;
  }
  function asafenumber(value2, title = "") {
    if (typeof value2 !== "number") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected number, got type=" + typeof value2);
    }
    if (!Number.isSafeInteger(value2)) {
      const prefix = title && `"${title}" `;
      throw new RangeError(prefix + "expected safe integer, got " + value2);
    }
  }
  function numberToHexUnpadded(num2) {
    const hex = abignumber(num2).toString(16);
    return hex.length & 1 ? "0" + hex : hex;
  }
  function hexToNumber(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    return hex === "" ? _0n : BigInt("0x" + hex);
  }
  function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
  }
  function bytesToNumberLE(bytes) {
    return hexToNumber(bytesToHex(copyBytes(abytes2(bytes)).reverse()));
  }
  function numberToBytesBE(n, len) {
    anumber(len);
    if (len === 0)
      throw new Error("zero output length is invalid");
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    if (hex.length > expectedLen)
      throw new RangeError("number is too large");
    return hexToBytes(hex.padStart(expectedLen, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function numberToVarBytesBE(n) {
    return hexToBytes(numberToHexUnpadded(abignumber(n)));
  }
  function equalBytes(a, b) {
    a = abytes3(a);
    b = abytes3(b);
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(abytes3(bytes));
  }
  function asciiToBytes(ascii) {
    if (typeof ascii !== "string")
      throw new TypeError("ascii string expected, got " + typeof ascii);
    return Uint8Array.from(ascii, (c, i) => {
      const charCode = c.charCodeAt(0);
      if (c.length !== 1 || charCode > 127) {
        throw new RangeError(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
      }
      return charCode;
    });
  }
  function isPosBig(n) {
    return typeof n === "bigint" && _0n <= n;
  }
  function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
  }
  function aInRange(title, n, min, max) {
    if (!inRange(n, min, max))
      throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
  }
  function bitLen(n) {
    if (n < _0n)
      throw new Error("expected non-negative bigint, got " + n);
    return n === _0n ? 0 : n.toString(2).length;
  }
  function bitGet(n, pos) {
    if (typeof n !== "bigint")
      throw new TypeError('"n" expected bigint, got type=' + typeof n);
    asafenumber(pos, "pos");
    return n >> BigInt(pos) & _1n;
  }
  function bitSet(n, pos, value2) {
    if (typeof n !== "bigint")
      throw new TypeError('"n" expected bigint, got type=' + typeof n);
    asafenumber(pos, "pos");
    abool(value2, "value");
    const mask = _1n << BigInt(pos);
    return value2 ? n | mask : n & ~mask;
  }
  function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    anumber(hashLen, "hashLen");
    anumber(qByteLen, "qByteLen");
    if (typeof hmacFn !== "function")
      throw new TypeError("hmacFn must be a function");
    const u8n = (len) => new Uint8Array(len);
    const NULL = Uint8Array.of();
    const byte0 = Uint8Array.of(0);
    const byte1 = Uint8Array.of(1);
    const _maxDrbgIters = 1e3;
    let v = u8n(hashLen);
    let k = u8n(hashLen);
    let i = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
      i = 0;
    };
    const h2 = (...msgs) => hmacFn(k, concatBytes2(v, ...msgs));
    const reseed = (seed = NULL) => {
      k = h2(byte0, seed);
      v = h2();
      if (seed.length === 0)
        return;
      k = h2(byte1, seed);
      v = h2();
    };
    const gen = () => {
      if (i++ >= _maxDrbgIters)
        throw new Error("drbg: tried max amount of iterations");
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h2();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes2(...out);
    };
    const genUntil = (seed, pred) => {
      reset();
      reseed(seed);
      let res = void 0;
      while ((res = pred(gen())) === void 0)
        reseed();
      reset();
      return res;
    };
    return genUntil;
  }
  function validateObject(object2, fields = {}, optFields = {}, title = "object") {
    aobject2(object2, title);
    aobject2(fields, "fields");
    aobject2(optFields, "optFields");
    function checkField(fieldName, expectedType, isOpt) {
      const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
      const val = object2[fieldName];
      if (!Object.hasOwn(object2, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) {
        throw new TypeError(`${label} is invalid: expected own property`);
      }
      if (isOpt && val === void 0)
        return;
      const current = typeof val;
      if (current !== expectedType || val === null)
        throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
    }
    const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
    iter(fields, false);
    iter(optFields, true);
  }
  var abytes3, anumber2, bytesToHex2, concatBytes2, hexToBytes2, isBytes3, randomBytes2, _0n, _1n, atitle2, bitMask, notImplemented;
  var init_utils2 = __esm({
    "node_modules/@noble/curves/utils.js"() {
      init_utils();
      abytes3 = (value2, length2, title) => abytes2(value2, length2, title);
      anumber2 = anumber;
      bytesToHex2 = bytesToHex;
      concatBytes2 = (...arrays) => concatBytes(...arrays);
      hexToBytes2 = (hex) => hexToBytes(hex);
      isBytes3 = isBytes2;
      randomBytes2 = (bytesLength) => randomBytes(bytesLength);
      _0n = /* @__PURE__ */ BigInt(0);
      _1n = /* @__PURE__ */ BigInt(1);
      atitle2 = (title) => title ? `"${title}" ` : "";
      bitMask = (n) => {
        asafenumber(n, "n");
        return (_1n << BigInt(n)) - _1n;
      };
      notImplemented = () => {
        throw new Error("not implemented");
      };
    }
  });

  // node_modules/@noble/curves/abstract/modular.js
  function mod(a, b) {
    if (b <= _0n2)
      throw new Error("mod: expected positive modulus, got " + b);
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow(num2, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow: expected modulus > 1, got " + modulo);
    if (typeof power !== "bigint")
      throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
    if (power < _0n2)
      throw new Error("invalid exponent, negatives unsupported");
    if (power === _0n2)
      return _1n2;
    if (power === _1n2)
      return num2;
    let d = num2 % modulo;
    if (d < _0n2)
      d += modulo;
    if (power < POW_WINDOWED_MIN) {
      let p2 = _1n2;
      while (power > _0n2) {
        if (power & _1n2)
          p2 = p2 * d % modulo;
        d = d * d % modulo;
        power >>= _1n2;
      }
      return p2;
    }
    const digits = [];
    while (power > _0n2) {
      digits.push(Number(power & _15n));
      power >>= _4n;
    }
    const table = new Array(16);
    table[0] = _1n2;
    table[1] = d;
    for (let i = 2; i < 16; i++)
      table[i] = table[i - 1] * d % modulo;
    let p = table[digits[digits.length - 1]];
    for (let w = digits.length - 2; w >= 0; w--) {
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      const digit = digits[w];
      if (digit !== 0)
        p = p * table[digit] % modulo;
    }
    return p;
  }
  function pow2(x, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow2: expected modulus > 1, got " + modulo);
    if (power < _0n2)
      throw new Error("pow2: expected non-negative exponent, got " + power);
    let res = x;
    while (power-- > _0n2) {
      res *= res;
      res %= modulo;
    }
    return res;
  }
  function invert(number2, modulo) {
    if (number2 === _0n2)
      throw new Error("invert: expected non-zero number");
    if (modulo <= _1n2)
      throw new Error("invert: expected modulus > 1, got " + modulo);
    let a = mod(number2, modulo);
    let b = modulo;
    let x = _0n2, u = _1n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b - a * q;
      const m = x - u * q;
      b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function invertCt(a, prime) {
    if (prime <= _1n2)
      throw new Error("invertCt: expected prime modulus > 1, got " + prime);
    const an = mod(a, prime);
    if (an === _0n2)
      throw new Error("invertCt: expected non-zero number");
    const inverse = pow(an, prime - _2n, prime);
    if (mod(an * inverse, prime) !== _1n2)
      throw new Error("invertCt: does not exist");
    return inverse;
  }
  function assertIsSquare(Fp, root, n) {
    const F = Fp;
    if (!F.eql(F.sqr(root), n))
      throw new Error("Cannot find square root");
  }
  function aoddModulus(order, fnName) {
    if ((order & _1n2) === _0n2)
      throw new Error(fnName + ": expected odd modulus, got " + order);
  }
  function sqrt3mod4(Fp, n) {
    const F = Fp;
    const p1div4 = (F.ORDER + _1n2) / _4n;
    const root = F.pow(n, p1div4);
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt5mod8(Fp, n) {
    const F = Fp;
    const p5div8 = (F.ORDER - _5n) / _8n;
    const n2 = F.mul(n, _2n);
    const v = F.pow(n2, p5div8);
    const nv = F.mul(n, v);
    const i = F.mul(F.mul(nv, _2n), v);
    const root = F.mul(nv, F.sub(i, F.ONE));
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt9mod16(P) {
    const Fp_ = Field(P);
    const tn = tonelliShanks(P);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
    const c2 = tn(Fp_, c1);
    const c3 = tn(Fp_, Fp_.neg(c1));
    const c4 = (P + _7n) / _16n;
    return ((Fp, n) => {
      const F = Fp;
      let tv1 = F.pow(n, c4);
      let tv2 = F.mul(tv1, c1);
      const tv3 = F.mul(tv1, c2);
      const tv4 = F.mul(tv1, c3);
      const e1 = F.eql(F.sqr(tv2), n);
      const e2 = F.eql(F.sqr(tv3), n);
      tv1 = F.cmov(tv1, tv2, e1);
      tv2 = F.cmov(tv4, tv3, e2);
      const e3 = F.eql(F.sqr(tv2), n);
      const root = F.cmov(tv1, tv2, e3);
      assertIsSquare(F, root, n);
      return root;
    });
  }
  function tonelliShanks(P) {
    if (P < _3n)
      throw new Error("sqrt is not defined for small field");
    aoddModulus(P, "tonelliShanks");
    let Q = P - _1n2;
    let S = 0;
    while (Q % _2n === _0n2) {
      Q /= _2n;
      S++;
    }
    let Z = _2n;
    const _Fp = Field(P);
    while (FpLegendre(_Fp, Z) === 1) {
      if (Z++ > 1e3)
        throw new Error("Cannot find square root: probably non-prime P");
    }
    if (S === 1)
      return sqrt3mod4;
    let cc = _Fp.pow(Z, Q);
    const Q1div2 = (Q + _1n2) / _2n;
    return function tonelliSlow(Fp, n) {
      const F = Fp;
      if (F.is0(n))
        return n;
      if (FpLegendre(F, n) !== 1)
        throw new Error("Cannot find square root");
      let M = S;
      let c = F.mul(F.ONE, cc);
      let t = F.pow(n, Q);
      let R = F.pow(n, Q1div2);
      while (!F.eql(t, F.ONE)) {
        if (F.is0(t))
          throw new Error("Cannot find square root: probably non-prime P");
        let i = 1;
        let t_tmp = F.sqr(t);
        while (!F.eql(t_tmp, F.ONE)) {
          i++;
          t_tmp = F.sqr(t_tmp);
          if (i === M)
            throw new Error("Cannot find square root");
        }
        const exponent = _1n2 << BigInt(M - i - 1);
        const b = F.pow(c, exponent);
        M = i;
        c = F.sqr(b);
        t = F.mul(t, c);
        R = F.mul(R, b);
      }
      return R;
    };
  }
  function FpSqrt(P) {
    aoddModulus(P, "Fp.sqrt");
    if (P % _4n === _3n)
      return sqrt3mod4;
    if (P % _8n === _5n)
      return sqrt5mod8;
    if (P % _16n === _9n)
      return sqrt9mod16(P);
    return tonelliShanks(P);
  }
  function validateField(field) {
    aobject2(field, "field");
    if (typeof field.ORDER !== "bigint")
      throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
    asafenumber(field.BYTES, "BYTES");
    asafenumber(field.BITS, "BITS");
    for (const name of FIELD_FIELDS)
      afunction(field[name], "field." + name);
    if (field.BYTES < 1 || field.BITS < 1)
      throw new Error("invalid field: expected BYTES/BITS > 0");
    if (field.ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
    return field;
  }
  function FpInvertBatch(Fp, nums, passZero = false) {
    validateField(Fp);
    aarray(nums, "nums");
    abool(passZero, "passZero");
    const F = Fp;
    const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
    const multipliedAcc = nums.reduce((acc, num2, i) => {
      if (F.is0(num2))
        return acc;
      inverted[i] = acc;
      return F.mul(acc, num2);
    }, F.ONE);
    const invertedAcc = F.inv(multipliedAcc);
    nums.reduceRight((acc, num2, i) => {
      if (F.is0(num2))
        return acc;
      inverted[i] = F.mul(acc, inverted[i]);
      return F.mul(acc, num2);
    }, invertedAcc);
    return inverted;
  }
  function FpLegendre(Fp, n) {
    validateField(Fp);
    const F = Fp;
    aoddModulus(F.ORDER, "FpLegendre");
    const p1mod2 = (F.ORDER - _1n2) / _2n;
    const powered = F.pow(n, p1mod2);
    const yes = F.eql(powered, F.ONE);
    const zero = F.eql(powered, F.ZERO);
    const no = F.eql(powered, F.neg(F.ONE));
    if (!yes && !zero && !no)
      throw new Error("invalid Legendre symbol result");
    return yes ? 1 : zero ? 0 : -1;
  }
  function FpIsSquare(Fp, n) {
    const l = FpLegendre(Fp, n);
    return l !== -1;
  }
  function nLength(n, nBitLength) {
    if (nBitLength !== void 0)
      anumber2(nBitLength);
    if (n <= _0n2)
      throw new Error("invalid n length: expected positive n, got " + n);
    if (nBitLength !== void 0 && nBitLength < 1)
      throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
    const bits = bitLen(n);
    if (nBitLength !== void 0 && nBitLength < bits)
      throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
    const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  function Field(ORDER, opts = {}) {
    Object.freeze(_Field.prototype);
    return new _Field(ORDER, opts);
  }
  function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== "bigint")
      throw new Error("field order must be bigint");
    if (fieldOrder <= _1n2)
      throw new Error("field order must be greater than 1");
    const bitLength = bitLen(fieldOrder - _1n2);
    return Math.ceil(bitLength / 8);
  }
  function getMinHashLength(fieldOrder) {
    const length2 = getFieldBytesLength(fieldOrder);
    return length2 + Math.ceil(length2 / 2);
  }
  function mapHashToField(key, fieldOrder, isLE = false) {
    abytes3(key);
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = Math.max(getMinHashLength(fieldOrder), 16);
    if (len < minLen || len > 1024)
      throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
    const num2 = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
    const reduced = mod(num2, fieldOrder - _1n2) + _1n2;
    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
  }
  var _0n2, _1n2, _2n, _3n, _4n, _5n, _7n, _8n, _9n, _15n, _16n, POW_WINDOWED_MIN, FIELD_FIELDS, FIELD_SQRT, _Field;
  var init_modular = __esm({
    "node_modules/@noble/curves/abstract/modular.js"() {
      init_utils2();
      _0n2 = /* @__PURE__ */ BigInt(0);
      _1n2 = /* @__PURE__ */ BigInt(1);
      _2n = /* @__PURE__ */ BigInt(2);
      _3n = /* @__PURE__ */ BigInt(3);
      _4n = /* @__PURE__ */ BigInt(4);
      _5n = /* @__PURE__ */ BigInt(5);
      _7n = /* @__PURE__ */ BigInt(7);
      _8n = /* @__PURE__ */ BigInt(8);
      _9n = /* @__PURE__ */ BigInt(9);
      _15n = /* @__PURE__ */ BigInt(15);
      _16n = /* @__PURE__ */ BigInt(16);
      POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
      FIELD_FIELDS = [
        "create",
        "isValid",
        "is0",
        "neg",
        "inv",
        "sqrt",
        "sqr",
        "eql",
        "add",
        "sub",
        "mul",
        "pow",
        "div",
        "addN",
        "subN",
        "mulN",
        "sqrN"
      ];
      FIELD_SQRT = /* @__PURE__ */ new WeakMap();
      _Field = class {
        constructor(ORDER, opts = {}) {
          __publicField(this, "ORDER");
          __publicField(this, "BITS");
          __publicField(this, "BYTES");
          __publicField(this, "isLE");
          __publicField(this, "ZERO", _0n2);
          __publicField(this, "ONE", _1n2);
          __publicField(this, "_lengths");
          __publicField(this, "_mod");
          if (ORDER <= _1n2)
            throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
          let _nbitLength = void 0;
          this.isLE = false;
          if (opts != null && typeof opts === "object") {
            if (typeof opts.BITS === "number")
              _nbitLength = opts.BITS;
            if (typeof opts.sqrt === "function")
              Object.defineProperty(this, "sqrt", { value: opts.sqrt, enumerable: true });
            if (typeof opts.isLE === "boolean")
              this.isLE = opts.isLE;
            if (opts.allowedLengths)
              this._lengths = Object.freeze(opts.allowedLengths.slice());
            if (typeof opts.modFromBytes === "boolean")
              this._mod = opts.modFromBytes;
          }
          const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
          if (nByteLength > 2048)
            throw new Error("invalid field: expected ORDER of <= 2048 bytes");
          this.ORDER = ORDER;
          this.BITS = nBitLength;
          this.BYTES = nByteLength;
          Object.freeze(this);
        }
        create(num2) {
          return mod(num2, this.ORDER);
        }
        isValid(num2) {
          if (typeof num2 !== "bigint")
            throw new TypeError("invalid field element: expected bigint, got " + typeof num2);
          return _0n2 <= num2 && num2 < this.ORDER;
        }
        is0(num2) {
          return num2 === _0n2;
        }
        // is valid and invertible
        isValidNot0(num2) {
          return !this.is0(num2) && this.isValid(num2);
        }
        isOdd(num2) {
          return (num2 & _1n2) === _1n2;
        }
        neg(num2) {
          return mod(-num2, this.ORDER);
        }
        eql(lhs, rhs) {
          return lhs === rhs;
        }
        sqr(num2) {
          return mod(num2 * num2, this.ORDER);
        }
        add(lhs, rhs) {
          return mod(lhs + rhs, this.ORDER);
        }
        sub(lhs, rhs) {
          return mod(lhs - rhs, this.ORDER);
        }
        mul(lhs, rhs) {
          return mod(lhs * rhs, this.ORDER);
        }
        pow(num2, power) {
          return pow(num2, power, this.ORDER);
        }
        div(lhs, rhs) {
          return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
        }
        // Same as above, but doesn't normalize
        sqrN(num2) {
          return num2 * num2;
        }
        addN(lhs, rhs) {
          return lhs + rhs;
        }
        subN(lhs, rhs) {
          return lhs - rhs;
        }
        mulN(lhs, rhs) {
          return lhs * rhs;
        }
        inv(num2) {
          return invert(num2, this.ORDER);
        }
        sqrt(num2) {
          let sqrt = FIELD_SQRT.get(this);
          if (!sqrt)
            FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
          return sqrt(this, num2);
        }
        toBytes(num2) {
          return this.isLE ? numberToBytesLE(num2, this.BYTES) : numberToBytesBE(num2, this.BYTES);
        }
        fromBytes(bytes, skipValidation = false) {
          abytes3(bytes);
          const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
          if (allowedLengths) {
            if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
              throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
            }
            const padded = new Uint8Array(BYTES);
            padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
            bytes = padded;
          }
          if (bytes.length !== BYTES)
            throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
          let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
          if (modFromBytes)
            scalar = mod(scalar, ORDER);
          if (!skipValidation) {
            if (!this.isValid(scalar))
              throw new Error("invalid field element: outside of range 0..ORDER");
          }
          return scalar;
        }
        // TODO: we don't need it here, move out to separate fn
        invertBatch(lst) {
          return FpInvertBatch(this, lst, true);
        }
        // We can't move this out because Fp6, Fp12 implement it
        // and it's unclear what to return in there.
        cmov(a, b, condition) {
          abool(condition, "condition");
          return condition ? b : a;
        }
      };
    }
  });

  // node_modules/@noble/curves/abstract/curve.js
  function validatePointCons(Point) {
    const pc = Point;
    if (typeof pc !== "function")
      throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
    afunction(pc.fromAffine, "Point.fromAffine");
    afunction(pc.fromBytes, "Point.fromBytes");
    afunction(pc.fromHex, "Point.fromHex");
    aobject2(pc.BASE, "Point.BASE");
    aobject2(pc.ZERO, "Point.ZERO");
    validateField(pc.Fp);
    validateField(pc.Fn);
  }
  function normalizeZ(c, points) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
  }
  function validateW(W, bits, min = 1) {
    if (!Number.isSafeInteger(W) || W < min || W > bits)
      throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
  }
  function validateTableBytes(numPoints, fpBytes) {
    const bytes = numPoints * (4 * fpBytes + 128);
    if (bytes > TABLE_BYTES_MAX)
      throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
  }
  function probeRandomBytes(randomBytes3, length2) {
    if (randomBytes3 === void 0)
      return void 0;
    afunction(randomBytes3, "randomBytes");
    try {
      const probe = randomBytes3(length2);
      if (!isBytes3(probe) || probe.length !== length2)
        return void 0;
    } catch {
      return void 0;
    }
    return randomBytes3;
  }
  function validateMSMPoints(points, c) {
    aarray(points, "points");
    points.forEach((p, i) => {
      if (!(p instanceof c))
        throw new Error("invalid point at index " + i);
    });
  }
  function validateMSMScalars(scalars, field, maxScalar) {
    if (!Array.isArray(scalars))
      throw new Error("array of scalars expected");
    scalars.forEach((s, i) => {
      const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
      if (!ok)
        throw new Error("invalid scalar at index " + i);
    });
  }
  function getWindowSize(P) {
    return pointWindowSizes.get(P) || 1;
  }
  function oddMultiples(p, size) {
    const dbl = p.double();
    const t = [p];
    for (let j = 1; j < size; j++)
      t.push(t[j - 1].add(dbl));
    return t;
  }
  function wnafDigits(n, W) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const d = [];
    while (n > _0n3) {
      let w = 0;
      if (n & _1n3) {
        w = Number(n & mask);
        if (w >= half)
          w -= size;
        n -= BigInt(w);
      }
      d.push(w);
      n >>= _1n3;
    }
    return d;
  }
  function signedWindowDigits(n, W, windows) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const shiftBy = BigInt(W);
    const d = [];
    for (let w = 0; w < windows; w++) {
      let v = Number(n & mask);
      n >>= shiftBy;
      if (v > half) {
        v -= size;
        n += _1n3;
      }
      d.push(v);
    }
    if (n !== _0n3)
      throw new Error("invalid wnaf");
    return d;
  }
  function wnafWalk(zero, tables, digits) {
    let max = 0;
    for (const d of digits)
      max = Math.max(max, d.length);
    let acc = zero;
    for (let bit = max - 1; bit >= 0; bit--) {
      if (bit !== max - 1)
        acc = acc.double();
      for (let i = 0; i < digits.length; i++) {
        const w = digits[i][bit];
        if (w) {
          const item = tables[i][Math.abs(w) - 1 >> 1];
          acc = acc.add(w < 0 ? item.negate() : item);
        }
      }
    }
    return acc;
  }
  function mulAddUnsafe(c, points, scalars, allowOversized = false) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    abool(allowOversized, "allowOversized");
    validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
    if (points.length !== scalars.length)
      throw new Error("arrays of points and scalars must have equal length");
    const tables = points.map((p) => oddMultiples(p, 4));
    const digits = scalars.map((n) => wnafDigits(n, 4));
    return wnafWalk(c.ZERO, tables, digits);
  }
  function createField(order, field, isLE) {
    if (field) {
      if (field.ORDER !== order)
        throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
      validateField(field);
      return field;
    } else {
      return Field(order, { isLE });
    }
  }
  function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (type !== "weierstrass" && type !== "edwards")
      throw new Error('expected curve type "weierstrass" or "edwards"');
    if (FpFnLE === void 0)
      FpFnLE = type === "edwards";
    if (!CURVE || typeof CURVE !== "object")
      throw new Error(`expected valid ${type} CURVE object`);
    validateObject(curveOpts);
    for (const p of ["p", "n", "h"]) {
      const val = CURVE[p];
      if (!(isPosBig(val) && val !== _0n3))
        throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === "weierstrass" ? "b" : "d";
    const params = ["Gx", "Gy", "a", _b];
    for (const p of params) {
      if (!Fp.isValid(CURVE[p]))
        throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return { CURVE, Fp, Fn };
  }
  function createKeygen(randomSecretKey, getPublicKey) {
    return function keygen(seed) {
      const secretKey = randomSecretKey(seed);
      return { secretKey, publicKey: getPublicKey(secretKey) };
    };
  }
  var _0n3, _1n3, _4n2, BLIND_BYTES, BLIND_BITS, FW_WINDOW, TABLE_BYTES_MAX, pointWindowSizes, ScalarMultiplier;
  var init_curve = __esm({
    "node_modules/@noble/curves/abstract/curve.js"() {
      init_utils2();
      init_modular();
      _0n3 = /* @__PURE__ */ BigInt(0);
      _1n3 = /* @__PURE__ */ BigInt(1);
      _4n2 = /* @__PURE__ */ BigInt(4);
      BLIND_BYTES = 16;
      BLIND_BITS = 128;
      FW_WINDOW = 5;
      TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
      pointWindowSizes = /* @__PURE__ */ new WeakMap();
      ScalarMultiplier = class {
        // Parametrized with a given Point class (not individual point)
        constructor(Point, randomBytes3) {
          __publicField(this, "Point");
          __publicField(this, "BASE");
          __publicField(this, "ZERO");
          __publicField(this, "randomBytes");
          __publicField(this, "wnafPrecomputes", /* @__PURE__ */ new WeakMap());
          __publicField(this, "baseCanBeBlinded");
          __publicField(this, "bits");
          validatePointCons(Point);
          this.randomBytes = probeRandomBytes(randomBytes3, BLIND_BYTES);
          this.Point = Point;
          this.BASE = Point.BASE;
          this.ZERO = Point.ZERO;
          this.bits = Point.Fn.BITS;
        }
        /**
         * Creates a signed fixed-window wNAF precomputation table: for every window w, the
         * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
         * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
         * window absorbs the final carry of signed-digit recoding.
         * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
         * @param point - Point instance
         * @param W - window size
         * @param bits - scalar bitlength the table must cover
         */
        buildWnafTable(point, W, bits) {
          const windows = Math.ceil(bits / W) + 1;
          const half = 2 ** (W - 1);
          const comp = [];
          let base2 = point;
          for (let w = 0; w < windows; w++) {
            let acc = base2;
            for (let i = 0; i < half; i++) {
              comp.push(acc);
              acc = acc.add(base2);
            }
            base2 = comp[comp.length - 1].double();
          }
          return { W, bits, windows, comp };
        }
        /**
         * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
         * Constant-time: fixed window count with one table addition per window — zero digits feed
         * the fake accumulator — and no doublings; the lookup scans the whole window slice.
         * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
         * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
         * signedWindowDigits throws if `n` exceeds the table.
         * @returns real and fake (for const-time) points
         */
        wnafCachedCT(precomputes, n) {
          const { W, windows, comp } = precomputes;
          const half = 2 ** (W - 1);
          const digits = signedWindowDigits(n, W, windows);
          let p = this.ZERO;
          let f = this.BASE;
          for (let w = 0; w < windows; w++) {
            const digit = digits[w];
            const start = w * half;
            const idx = Math.abs(digit) - 1;
            let sel = comp[start];
            for (let i = 1; i < half; i++)
              sel = i === idx ? comp[start + i] : sel;
            const neg = sel.negate();
            if (digit === 0)
              f = f.add(comp[start]);
            else
              p = p.add(digit < 0 ? neg : sel);
          }
          return { p, f };
        }
        // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
        // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
        // incompatible `transform(...)` layouts and expect a separate cache entry.
        getWnafPrecomputes(W, point, bits, transform2) {
          let entries = this.wnafPrecomputes.get(point);
          let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
          if (!comp) {
            comp = this.buildWnafTable(point, W, bits);
            if (typeof transform2 === "function")
              comp = { ...comp, comp: transform2(comp.comp) };
            if (!entries) {
              entries = [];
              this.wnafPrecomputes.set(point, entries);
            }
            entries.push(comp);
          }
          return comp;
        }
        assertPoint(point) {
          if (!(point instanceof this.Point))
            throw new TypeError('"point" expected Point instance, got type=' + typeof point);
        }
        // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
        // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
        // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
        validateMulInput(point, scalar) {
          this.assertPoint(point);
          if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
            throw new Error("invalid scalar");
        }
        // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
        // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
        // multiply. `n` must be < 2^bits.
        runCT(point, n, bits, transform2) {
          const W = getWindowSize(point);
          if (W === 1)
            return this.fixedWindowCT(point, n, bits);
          return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform2), n);
        }
        mulCT(point, scalar, transform2) {
          this.validateMulInput(point, scalar);
          return this.runCT(point, scalar, this.bits, transform2);
        }
        mulCTBlinded(point, scalar, transform2) {
          this.validateMulInput(point, scalar);
          if (this.randomBytes === void 0)
            throw new Error("randomBytes is required for scalar blinding");
          const bits = this.Point.Fn.BITS + BLIND_BITS;
          const blind = this.randomBytes(BLIND_BYTES);
          if (!isBytes3(blind) || blind.length !== BLIND_BYTES)
            throw new Error("randomBytes returned invalid byte array");
          blind[0] = blind[0] & 63 | 128;
          const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
          return this.runCT(point, n, bits, transform2);
        }
        /**
         * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
         * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
         * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
         * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
         * every table entry, and one addition (adds the identity when the window digit is 0 — never
         * skipped).
         *
         * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
         * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
         * projective form (no normalizeZ): normalizing this small a table costs more than the
         * mixed-add savings it would buy for a single multiply.
         * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
         * (this path needs no fake accumulator — its op-count is already scalar-independent).
         */
        fixedWindowCT(point, n, bits) {
          const W = FW_WINDOW;
          const size = 1 << W;
          const mask = bitMask(W);
          const table = new Array(size);
          table[0] = this.ZERO;
          for (let i = 1; i < size; i++)
            table[i] = table[i - 1].add(point);
          const windows = Math.ceil(bits / W);
          let acc = this.ZERO;
          for (let window2 = windows - 1; window2 >= 0; window2--) {
            if (window2 !== windows - 1)
              for (let d = 0; d < W; d++)
                acc = acc.double();
            const digit = Number(n >> BigInt(window2 * W) & mask);
            let sel = table[0];
            for (let i = 1; i < size; i++)
              sel = i === digit ? table[i] : sel;
            acc = acc.add(sel);
          }
          return { p: acc, f: acc };
        }
        shouldBlind(point, cofactor) {
          if (this.randomBytes === void 0)
            return false;
          if (cofactor === _1n3)
            return true;
          if (point !== this.BASE)
            return false;
          if (this.baseCanBeBlinded === void 0)
            this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
          return this.baseCanBeBlinded;
        }
        mulSecret(point, scalar, cofactor, transform2) {
          return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform2) : this.mulCT(point, scalar, transform2);
        }
        mulUnsafe(point, scalar, transform2) {
          this.assertPoint(point);
          if (!isPosBig(scalar))
            throw new Error("invalid scalar");
          const W = getWindowSize(point);
          if (W === 1 || scalar >= this.Point.Fn.ORDER)
            return mulAddUnsafe(this.Point, [point], [scalar], true);
          const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform2);
          return this.wnafCachedCT(precomputes, scalar).p;
        }
        // Remembers the window size used for precomputed wNAF multiplication of the given point
        // and drops any previously built tables. Usually only the base point is precomputed.
        // W=1 resets the point to the un-precomputed (table-less) paths.
        // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
        setWindowSize(point, W) {
          this.assertPoint(point);
          validateW(W, this.bits);
          const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
          validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
          pointWindowSizes.set(point, W);
          this.wnafPrecomputes.delete(point);
        }
        // True when a window size is set: tables themselves are built lazily on first multiply.
        hasWindowSize(point) {
          return getWindowSize(point) !== 1;
        }
      };
    }
  });

  // node_modules/@noble/curves/abstract/fft.js
  function checkU32(n, title = "n") {
    if (typeof n !== "number")
      throw new TypeError(`wrong u32 integer "${title}": expected number, got type=${typeof n}`);
    if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295)
      throw new RangeError(`wrong u32 integer "${title}": expected 0..4294967295, got ${n}`);
    return n;
  }
  function isPowerOfTwo(x) {
    checkU32(x, "x");
    return (x & x - 1) === 0 && x !== 0;
  }
  function nextPowerOfTwo(n) {
    checkU32(n);
    if (n <= 1)
      return 1;
    if (n > 2147483648)
      throw new Error("nextPowerOfTwo overflow: result does not fit u32");
    return 1 << log2(n - 1) + 1 >>> 0;
  }
  function log2(n) {
    checkU32(n);
    return 31 - Math.clz32(n);
  }
  function poly(field, roots, create, fft, length2) {
    validateField(field);
    const F = field;
    const _create = create || ((len, elm) => new Array(len).fill(elm ?? F.ZERO));
    const isPoly = (x) => {
      if (Array.isArray(x))
        return true;
      if (!ArrayBuffer.isView(x))
        return false;
      const v = x;
      return typeof v.length === "number" && typeof v.slice === "function" && typeof v[Symbol.iterator] === "function";
    };
    const checkPoly = (title, value2) => {
      if (!isPoly(value2))
        throw new TypeError(`"${title}" expected polynomial, got type=${typeof value2}`);
    };
    const checkLength = (a, b) => {
      checkPoly("a", a);
      const L = a.length;
      if (b !== void 0) {
        checkPoly("b", b);
        if (b.length !== L)
          throw new Error(`poly: mismatched lengths ${L} vs ${b.length}`);
      }
      if (length2 !== void 0 && L !== length2)
        throw new Error(`poly: expected fixed length ${length2}, got ${L}`);
      return L;
    };
    function findOmegaIndex(x, n, brp = false, weights) {
      if (!isPowerOfTwo(n))
        throw new Error("poly.lagrange: expected power of two length, got " + n);
      const omega = weights || (brp ? roots.brp(log2(n)) : roots.roots(log2(n)));
      for (let i = 0; i < n; i++)
        if (F.eql(x, omega[i]))
          return i;
      return -1;
    }
    return {
      roots,
      create: _create,
      length: length2,
      extend: (a, len) => {
        checkLength(a);
        const out = _create(len, F.ZERO);
        for (let i = 0; i < Math.min(a.length, len); i++)
          out[i] = a[i];
        return out;
      },
      degree: (a) => {
        checkLength(a);
        for (let i = a.length - 1; i >= 0; i--)
          if (!F.is0(a[i]))
            return i;
        return -1;
      },
      add: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.add(a[i], b[i]);
        return out;
      },
      sub: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.sub(a[i], b[i]);
        return out;
      },
      dot: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.mul(a[i], b[i]);
        return out;
      },
      mul: (a, b) => {
        if (isPoly(b)) {
          const len = checkLength(a, b);
          if (fft) {
            const A = fft.direct(a, false, true);
            const B = fft.direct(b, false, true);
            for (let i = 0; i < A.length; i++)
              A[i] = F.mul(A[i], B[i]);
            return fft.inverse(A, true, false);
          } else {
            const res = _create(len);
            for (let i = 0; i < len; i++) {
              for (let j = 0; j < len; j++) {
                const k = (i + j) % len;
                res[k] = F.add(res[k], F.mul(a[i], b[j]));
              }
            }
            return res;
          }
        } else {
          const out = _create(checkLength(a));
          for (let i = 0; i < out.length; i++)
            out[i] = F.mul(a[i], b);
          return out;
        }
      },
      convolve(a, b) {
        checkPoly("a", a);
        checkPoly("b", b);
        const len = nextPowerOfTwo(a.length + b.length - 1);
        return this.mul(this.extend(a, len), this.extend(b, len));
      },
      shift(p, factor) {
        checkPoly("p", p);
        const out = _create(p.length);
        if (length2 !== void 0 && p.length !== length2)
          throw new Error(`poly: expected fixed length ${length2}, got ${p.length}`);
        if (!p.length)
          return out;
        out[0] = p[0];
        for (let i = 1, power = F.ONE; i < p.length; i++) {
          power = F.mul(power, factor);
          out[i] = F.mul(p[i], power);
        }
        return out;
      },
      clone: (a) => {
        checkLength(a);
        const out = _create(a.length);
        for (let i = 0; i < a.length; i++)
          out[i] = a[i];
        return out;
      },
      eval: (a, basis) => {
        checkLength(a, basis);
        let acc = F.ZERO;
        for (let i = 0; i < a.length; i++)
          acc = F.add(acc, F.mul(a[i], basis[i]));
        return acc;
      },
      monomial: {
        basis: (x, n) => {
          const out = _create(n);
          let pow3 = F.ONE;
          for (let i = 0; i < n; i++) {
            out[i] = pow3;
            pow3 = F.mul(pow3, x);
          }
          return out;
        },
        eval: (a, x) => {
          checkLength(a);
          let acc = F.ZERO;
          for (let i = a.length - 1; i >= 0; i--)
            acc = F.add(F.mul(acc, x), a[i]);
          return acc;
        }
      },
      lagrange: {
        basis: (x, n, brp = false, weights) => {
          if (!isPowerOfTwo(n))
            throw new Error("poly.lagrange: expected power of two length, got " + n);
          const bits = log2(n);
          const cache = weights || (brp ? roots.brp(bits) : roots.roots(bits));
          const out = _create(n);
          const idx = findOmegaIndex(x, n, brp, weights);
          if (idx !== -1) {
            out[idx] = F.ONE;
            return out;
          }
          const tm = F.pow(x, BigInt(n));
          const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n)));
          const denom = _create(n);
          for (let i = 0; i < n; i++)
            denom[i] = F.sub(x, cache[i]);
          const inv = F.invertBatch(denom);
          for (let i = 0; i < n; i++)
            out[i] = F.mul(c, F.mul(cache[i], inv[i]));
          return out;
        },
        eval(a, x, brp = false) {
          checkLength(a);
          const idx = findOmegaIndex(x, a.length, brp);
          if (idx !== -1)
            return a[idx];
          const L = this.basis(x, a.length, brp);
          let acc = F.ZERO;
          for (let i = 0; i < a.length; i++)
            if (!F.is0(a[i]))
              acc = F.add(acc, F.mul(a[i], L[i]));
          return acc;
        }
      },
      vanishing(roots2) {
        checkPoly("roots", roots2);
        if (length2 !== void 0 && roots2.length !== length2)
          throw new Error(`poly: expected fixed length ${length2}, got ${roots2.length}`);
        const out = _create(roots2.length + 1, F.ZERO);
        out[0] = F.ONE;
        for (const r of roots2) {
          const neg = F.neg(r);
          for (let j = out.length - 1; j > 0; j--)
            out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
          out[0] = F.mul(out[0], neg);
        }
        return out;
      }
    };
  }
  var init_fft = __esm({
    "node_modules/@noble/curves/abstract/fft.js"() {
      init_modular();
    }
  });

  // node_modules/@noble/curves/abstract/hash-to-curve.js
  function i2osp(value2, length2) {
    asafenumber(value2);
    asafenumber(length2);
    if (length2 < 0 || length2 > 4)
      throw new Error("invalid I2OSP length: " + length2);
    if (value2 < 0 || value2 > 2 ** (8 * length2) - 1)
      throw new Error("invalid I2OSP input: " + value2);
    const res = Array.from({ length: length2 }).fill(0);
    for (let i = length2 - 1; i >= 0; i--) {
      res[i] = value2 & 255;
      value2 >>>= 8;
    }
    return new Uint8Array(res);
  }
  function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      arr[i] = a[i] ^ b[i];
    }
    return arr;
  }
  function normDST(DST) {
    if (!isBytes3(DST) && typeof DST !== "string")
      throw new Error("DST must be Uint8Array or ascii string");
    const dst = typeof DST === "string" ? asciiToBytes(DST) : DST;
    if (dst.length === 0)
      throw new Error("DST must be non-empty");
    return dst;
  }
  function expand_message_xmd(msg, DST, lenInBytes, H) {
    abytes3(msg);
    asafenumber(lenInBytes);
    if (typeof H !== "function")
      throw new Error("expand_message_xmd: expected hash function");
    asafenumber(H.outputLen, "hash.outputLen");
    asafenumber(H.blockLen, "hash.blockLen");
    DST = normDST(DST);
    if (DST.length > 255)
      DST = H(concatBytes2(asciiToBytes("H2C-OVERSIZE-DST-"), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (lenInBytes > 65535 || ell > 255)
      throw new Error("expand_message_xmd: invalid lenInBytes");
    const DST_prime = concatBytes2(DST, i2osp(DST.length, 1));
    const Z_pad = new Uint8Array(r_in_bytes);
    const l_i_b_str = i2osp(lenInBytes, 2);
    const b = new Array(ell);
    const b_0 = H(concatBytes2(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H(concatBytes2(b_0, i2osp(1, 1), DST_prime));
    for (let i = 1; i < ell; i++) {
      const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
      b[i] = H(concatBytes2(...args));
    }
    const pseudo_random_bytes = concatBytes2(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
  }
  function expand_message_xof(msg, DST, lenInBytes, k, H) {
    abytes3(msg);
    asafenumber(lenInBytes);
    asafenumber(k, "k");
    if (k < 0)
      throw new Error("expand_message_xof: invalid k");
    if (typeof H !== "function")
      throw new Error("expand_message_xof: expected XOF function");
    if (typeof H.create !== "function")
      throw new Error("expand_message_xof: expected XOF create");
    DST = normDST(DST);
    if (lenInBytes < 0 || lenInBytes > 65535)
      throw new Error("expand_message_xof: invalid lenInBytes");
    if (DST.length > 255) {
      const dkLen = Math.ceil(2 * k / 8);
      DST = H.create({ dkLen }).update(asciiToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
    }
    if (DST.length > 255)
      throw new Error("expand_message_xof: invalid DST");
    return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
  }
  function hash_to_field(msg, count, options) {
    validateObject(options, {
      p: "bigint",
      m: "number",
      k: "number",
      hash: "function"
    });
    const { p, k, m, hash, expand, DST } = options;
    asafenumber(hash.outputLen, "valid hash");
    abytes3(msg);
    asafenumber(count);
    asafenumber(m, "m");
    asafenumber(k, "k");
    if (p <= BigInt(1))
      throw new Error("hash_to_field: expected valid field characteristic");
    if (count < 1)
      throw new Error("hash_to_field: expected count >= 1");
    if (m < 1)
      throw new Error("hash_to_field: expected m >= 1");
    if (k < 0)
      throw new Error("hash_to_field: invalid k");
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8);
    const len_in_bytes = count * m * L;
    let prb;
    if (expand === "xmd") {
      prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    } else if (expand === "xof") {
      prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    } else if (expand === "_internal_pass") {
      prb = msg;
    } else {
      throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for (let i = 0; i < count; i++) {
      const e = new Array(m);
      for (let j = 0; j < m; j++) {
        const elm_offset = L * (j + i * m);
        const tv = prb.subarray(elm_offset, elm_offset + L);
        e[j] = mod(os2ip(tv), p);
      }
      u[i] = e;
    }
    return u;
  }
  function isogenyMap(field, map) {
    validateField(field);
    aarray(map, "map");
    const coeff = map.map((i, row) => {
      aarray(i, "map[" + row + "]");
      if (i.length < 1)
        throw new Error("isogenyMap: expected non-empty coefficients");
      return Array.from(i).reverse();
    });
    return (x, y) => {
      const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
      const isZero = field.is0(xd) || field.is0(yd);
      const [xd_inv, yd_inv] = FpInvertBatch(field, [xd, yd], true);
      x = field.mul(xn, xd_inv);
      y = field.mul(y, field.mul(yn, yd_inv));
      return isZero ? { x: field.ZERO, y: field.ZERO } : { x, y };
    };
  }
  function createHasher3(Point, mapToCurve, defaults) {
    if (typeof mapToCurve !== "function")
      throw new Error("mapToCurve() must be defined");
    validateObject(defaults);
    const snapshot = (src) => Object.freeze({
      ...src,
      DST: isBytes3(src.DST) ? copyBytes(src.DST) : src.DST,
      ...src.encodeDST === void 0 ? {} : { encodeDST: isBytes3(src.encodeDST) ? copyBytes(src.encodeDST) : src.encodeDST }
    });
    const safeDefaults = snapshot(defaults);
    const dstOverride = (options) => options && options.DST !== void 0 ? { DST: options.DST } : void 0;
    function map(num2) {
      return Point.fromAffine(mapToCurve(num2));
    }
    function clear(initial) {
      const P = initial.clearCofactor();
      if (P.equals(Point.ZERO))
        return Point.ZERO;
      P.assertValidity();
      return P;
    }
    return Object.freeze({
      get defaults() {
        return snapshot(safeDefaults);
      },
      Point,
      hashToCurve(msg, options) {
        const opts = Object.assign({}, safeDefaults, dstOverride(options));
        const u = hash_to_field(msg, 2, opts);
        const u0 = map(u[0]);
        const u1 = map(u[1]);
        return clear(u0.add(u1));
      },
      encodeToCurve(msg, options) {
        const optsDst = safeDefaults.encodeDST === void 0 ? {} : { DST: safeDefaults.encodeDST };
        const opts = Object.assign({}, safeDefaults, optsDst, dstOverride(options));
        const u = hash_to_field(msg, 1, opts);
        const u0 = map(u[0]);
        return clear(u0);
      },
      /** See {@link H2CHasher} */
      mapToCurve(scalars) {
        if (safeDefaults.m === 1) {
          if (typeof scalars !== "bigint")
            throw new Error("expected bigint (m=1)");
          return clear(map([scalars]));
        }
        if (!Array.isArray(scalars))
          throw new Error("expected array of bigints");
        if (scalars.length !== safeDefaults.m)
          throw new Error(`expected array of ${safeDefaults.m} bigints`);
        for (const i of scalars)
          if (typeof i !== "bigint")
            throw new Error("expected array of bigints");
        return clear(map(scalars));
      },
      // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
      // RFC 9380, draft-irtf-cfrg-bbs-signatures-08. Default scalar DST is the shared generic
      // `HashToScalar-` prefix above unless the caller overrides it per invocation.
      hashToScalar(msg, options) {
        const N = Point.Fn.ORDER;
        const opts = Object.assign({}, safeDefaults, { DST: _DST_scalar }, dstOverride(options), {
          p: N,
          m: 1
        });
        return hash_to_field(msg, 1, opts)[0][0];
      }
    });
  }
  function SWUFpSqrtRatio(Fp, Z) {
    const F = validateField(Fp);
    const q = F.ORDER;
    let l = _0n4;
    for (let o = q - _1n4; o % _2n2 === _0n4; o /= _2n2)
      l += _1n4;
    const c1 = l;
    const _2n_pow_c1_1 = _2n2 << c1 - _1n4 - _1n4;
    const _2n_pow_c1 = _2n_pow_c1_1 * _2n2;
    const c2 = (q - _1n4) / _2n_pow_c1;
    const c3 = (c2 - _1n4) / _2n2;
    const c4 = _2n_pow_c1 - _1n4;
    const c5 = _2n_pow_c1_1;
    const c6 = F.pow(Z, c2);
    const c7 = F.pow(Z, (c2 + _1n4) / _2n2);
    let sqrtRatio = (u, v) => {
      let tv1 = c6;
      let tv2 = F.pow(v, c4);
      let tv3 = F.sqr(tv2);
      tv3 = F.mul(tv3, v);
      let tv5 = F.mul(u, tv3);
      tv5 = F.pow(tv5, c3);
      tv5 = F.mul(tv5, tv2);
      tv2 = F.mul(tv5, v);
      tv3 = F.mul(tv5, u);
      let tv4 = F.mul(tv3, tv2);
      tv5 = F.pow(tv4, c5);
      let isQR = F.eql(tv5, F.ONE);
      tv2 = F.mul(tv3, c7);
      tv5 = F.mul(tv4, tv1);
      tv3 = F.cmov(tv2, tv3, isQR);
      tv4 = F.cmov(tv5, tv4, isQR);
      for (let i = c1; i > _1n4; i--) {
        let tv52 = i - _2n2;
        tv52 = _2n2 << tv52 - _1n4;
        let tvv5 = F.pow(tv4, tv52);
        const e1 = F.eql(tvv5, F.ONE);
        tv2 = F.mul(tv3, tv1);
        tv1 = F.mul(tv1, tv1);
        tvv5 = F.mul(tv4, tv1);
        tv3 = F.cmov(tv2, tv3, e1);
        tv4 = F.cmov(tvv5, tv4, e1);
      }
      return { isValid: !F.is0(v) && (isQR || F.is0(u)), value: tv3 };
    };
    if (F.ORDER % _4n3 === _3n2) {
      const c12 = (F.ORDER - _3n2) / _4n3;
      const c22 = F.sqrt(F.neg(Z));
      sqrtRatio = (u, v) => {
        let tv1 = F.sqr(v);
        const tv2 = F.mul(u, v);
        tv1 = F.mul(tv1, tv2);
        let y1 = F.pow(tv1, c12);
        y1 = F.mul(y1, tv2);
        const y2 = F.mul(y1, c22);
        const tv3 = F.mul(F.sqr(y1), v);
        const isQR = F.eql(tv3, u);
        let y = F.cmov(y2, y1, isQR);
        return { isValid: !F.is0(v) && isQR, value: y };
      };
    }
    return sqrtRatio;
  }
  function mapToCurveSimpleSWU(Fp, opts) {
    const F = validateField(Fp);
    validateObject(opts, {}, {}, "opts");
    const { A, B, Z } = opts;
    if (!F.isValidNot0(A) || !F.isValidNot0(B) || !F.isValid(Z))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    if (F.eql(Z, F.neg(F.ONE)) || FpIsSquare(F, Z))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    const x = F.mul(B, F.inv(F.mul(Z, A)));
    const gx = F.add(F.add(F.mul(F.sqr(x), x), F.mul(A, x)), B);
    if (!FpIsSquare(F, gx))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    const sqrtRatio = SWUFpSqrtRatio(F, Z);
    if (!F.isOdd)
      throw new Error("Field does not have .isOdd()");
    return (u) => {
      let tv1, tv2, tv3, tv4, tv5, tv6, x2, y;
      tv1 = F.sqr(u);
      tv1 = F.mul(tv1, Z);
      tv2 = F.sqr(tv1);
      tv2 = F.add(tv2, tv1);
      tv3 = F.add(tv2, F.ONE);
      tv3 = F.mul(tv3, B);
      tv4 = F.cmov(Z, F.neg(tv2), !F.eql(tv2, F.ZERO));
      tv4 = F.mul(tv4, A);
      tv2 = F.sqr(tv3);
      tv6 = F.sqr(tv4);
      tv5 = F.mul(tv6, A);
      tv2 = F.add(tv2, tv5);
      tv2 = F.mul(tv2, tv3);
      tv6 = F.mul(tv6, tv4);
      tv5 = F.mul(tv6, B);
      tv2 = F.add(tv2, tv5);
      x2 = F.mul(tv1, tv3);
      const { isValid, value: value2 } = sqrtRatio(tv2, tv6);
      y = F.mul(tv1, u);
      y = F.mul(y, value2);
      x2 = F.cmov(x2, tv3, isValid);
      y = F.cmov(y, value2, isValid);
      const e1 = F.isOdd(u) === F.isOdd(y);
      y = F.cmov(F.neg(y), y, e1);
      const tv4_inv = FpInvertBatch(F, [tv4], true)[0];
      x2 = F.mul(x2, tv4_inv);
      return { x: x2, y };
    };
  }
  var _0n4, _1n4, _2n2, _3n2, _4n3, os2ip, _DST_scalar;
  var init_hash_to_curve = __esm({
    "node_modules/@noble/curves/abstract/hash-to-curve.js"() {
      init_utils2();
      init_modular();
      _0n4 = /* @__PURE__ */ BigInt(0);
      _1n4 = /* @__PURE__ */ BigInt(1);
      _2n2 = /* @__PURE__ */ BigInt(2);
      _3n2 = /* @__PURE__ */ BigInt(3);
      _4n3 = /* @__PURE__ */ BigInt(4);
      os2ip = bytesToNumberBE;
      _DST_scalar = "HashToScalar-";
    }
  });

  // node_modules/@noble/curves/abstract/frost.js
  function createFROST(opts) {
    validateObject(opts, {
      name: "string",
      hash: "function"
    }, {
      hashToScalar: "function",
      validatePoint: "function",
      parsePublicKey: "function",
      adjustScalar: "function",
      adjustPoint: "function",
      challenge: "function",
      adjustNonces: "function",
      adjustSecret: "function",
      adjustPublic: "function",
      adjustGroupCommitmentShare: "function",
      adjustTx: "object",
      adjustDKG: "function"
    });
    validatePointCons(opts.Point);
    const { Point, validatePoint, parsePublicKey, adjustScalar, adjustPoint: adjustPointHook, challenge: challenge2, adjustNonces, adjustSecret, adjustPublic, adjustGroupCommitmentShare, adjustDKG } = opts;
    const Fn = opts.Fn === void 0 ? Point.Fn : opts.Fn;
    const adjustTx = opts.adjustTx === void 0 ? void 0 : { encode: opts.adjustTx.encode, decode: opts.adjustTx.decode };
    if (adjustTx)
      validateObject(adjustTx, { encode: "function", decode: "function" });
    const hashBytes = opts.hash;
    const hashToScalar = opts.hashToScalar === void 0 ? (msg, opts2 = { DST: new Uint8Array() }) => {
      const t = hashBytes(concatBytes2(opts2.DST, msg));
      return Fn.create(Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t));
    } : opts.hashToScalar;
    const H1Prefix = utf8ToBytes2(opts.H1 !== void 0 ? opts.H1 : opts.name + "rho");
    const H2Prefix = utf8ToBytes2(opts.H2 !== void 0 ? opts.H2 : opts.name + "chal");
    const H3Prefix = utf8ToBytes2(opts.H3 !== void 0 ? opts.H3 : opts.name + "nonce");
    const H4Prefix = utf8ToBytes2(opts.H4 !== void 0 ? opts.H4 : opts.name + "msg");
    const H5Prefix = utf8ToBytes2(opts.H5 !== void 0 ? opts.H5 : opts.name + "com");
    const HDKGPrefix = utf8ToBytes2(opts.HDKG !== void 0 ? opts.HDKG : opts.name + "dkg");
    const HIDPrefix = utf8ToBytes2(opts.HID !== void 0 ? opts.HID : opts.name + "id");
    const H1 = (msg) => hashToScalar(msg, { DST: H1Prefix });
    const H2 = (msg) => hashToScalar(msg, { DST: H2Prefix });
    const H3 = (msg) => hashToScalar(msg, { DST: H3Prefix });
    const H4 = (msg) => hashBytes(concatBytes2(H4Prefix, msg));
    const H5 = (msg) => hashBytes(concatBytes2(H5Prefix, msg));
    const HDKG = (msg) => hashToScalar(msg, { DST: HDKGPrefix });
    const HID = (msg) => hashToScalar(msg, { DST: HIDPrefix });
    const randomScalar = (rng = randomBytes2) => {
      if (typeof rng !== "function")
        throw new TypeError('"rng" expected function, got type=' + typeof rng);
      const t = mapHashToField(rng(getMinHashLength(Fn.ORDER)), Fn.ORDER, Fn.isLE);
      return Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
    };
    const serializePoint = (p) => p.toBytes();
    const validatePublicPoint = (p) => {
      p.assertValidity();
      if (p.is0())
        throw new Error("invalid point: identity");
      if (!p.isTorsionFree())
        throw new Error("bad point: not in prime-order subgroup");
      if (validatePoint)
        validatePoint(p);
      return p;
    };
    const parsePoint = (bytes) => validatePublicPoint(Point.fromBytes(bytes));
    const nonceCommitments = (identifier, nonces) => ({
      identifier,
      hiding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.hiding))),
      binding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.binding)))
    });
    const adjustPoint = adjustPointHook === void 0 ? (n) => n : adjustPointHook;
    const validateIdentifier = (n) => {
      if (!Fn.isValid(n) || Fn.is0(n))
        throw new Error("Invalid identifier " + n);
      return n;
    };
    const serializeIdentifier = (id) => bytesToHex2(Fn.toBytes(validateIdentifier(id)));
    const parseIdentifier = (id, title = "identifier") => {
      astring(id, title);
      const n = validateIdentifier(Fn.fromBytes(hexToBytes2(id)));
      if (serializeIdentifier(n) !== id)
        throw new Error("expected canonical identifier hex");
      return n;
    };
    const copyRound1Package = (p) => ({
      identifier: serializeIdentifier(parseIdentifier(p.identifier)),
      commitment: p.commitment.map((c) => copyBytes(c)),
      proofOfKnowledge: copyBytes(p.proofOfKnowledge)
    });
    const canonicalRound1Packages = (packages) => {
      const snapshot = packages.map(copyRound1Package);
      snapshot.sort((a, b) => {
        const ai = parseIdentifier(a.identifier);
        const bi = parseIdentifier(b.identifier);
        return ai < bi ? -1 : ai > bi ? 1 : 0;
      });
      return snapshot;
    };
    const equalRound1Transcripts = (a, b) => {
      if (a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++) {
        const p = a[i];
        const q = b[i];
        if (p.identifier !== q.identifier || p.commitment.length !== q.commitment.length)
          return false;
        for (let j = 0; j < p.commitment.length; j++) {
          if (!equalBytes(p.commitment[j], q.commitment[j]))
            return false;
        }
        if (!equalBytes(p.proofOfKnowledge, q.proofOfKnowledge))
          return false;
      }
      return true;
    };
    const Signature = {
      // RFC 9591 Appendix A encodes signatures canonically as
      // SerializeElement(R) || SerializeScalar(z).
      encode: (R, z) => {
        let res = concatBytes2(serializePoint(R), Fn.toBytes(z));
        if (adjustTx)
          res = adjustTx.encode(res);
        return res;
      },
      decode: (sig) => {
        if (adjustTx)
          sig = adjustTx.decode(sig);
        const Rbytes = sig.subarray(0, -Fn.BYTES);
        const R = parsePoint(Rbytes);
        if (serializePoint(R).length !== Rbytes.length)
          throw new Error("invalid signature encoding");
        const z = Fn.fromBytes(sig.subarray(-Fn.BYTES));
        return { R, z };
      }
    };
    const genPointScalarPair = (rng = randomBytes2) => {
      let n = randomScalar(rng);
      if (adjustScalar)
        n = adjustScalar(n);
      let p = Point.BASE.multiply(n);
      return { scalar: n, point: p };
    };
    const nrErr = "roots are unavailable in FROST polynomial mode";
    const noRoots = {
      info: { G: Fn.ZERO, oddFactor: Fn.ZERO, powerOfTwo: 0 },
      roots() {
        throw new Error(nrErr);
      },
      brp() {
        throw new Error(nrErr);
      },
      inverse() {
        throw new Error(nrErr);
      },
      omega() {
        throw new Error(nrErr);
      },
      clear() {
      }
    };
    const Poly = poly(Fn, noRoots);
    const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
    const polynomialEvaluate = (x, coeffs) => {
      if (!coeffs.length)
        throw new Error("empty coefficients");
      return Poly.monomial.eval(coeffs, x);
    };
    const deriveInterpolatingValue = (L, xi) => {
      const err = "invalid parameters";
      if (!L.some((x) => Fn.eql(x, xi)))
        throw new Error(err);
      const Lset = new Set(L);
      if (Lset.size !== L.length)
        throw new Error(err);
      if (!Lset.has(xi))
        throw new Error(err);
      let num2 = Fn.ONE;
      let den = Fn.ONE;
      for (const x of L) {
        if (Fn.eql(x, xi))
          continue;
        num2 = Fn.mul(num2, x);
        den = Fn.mul(den, Fn.sub(x, xi));
      }
      return Fn.div(num2, den);
    };
    const evalutateVSS = (identifier, commitment) => {
      const monomial = Poly.monomial.basis(identifier, commitment.length);
      return msm(commitment, monomial);
    };
    const generateSecretPolynomial = (signers, secret, coeffs, rng = randomBytes2) => {
      validateSigners(signers);
      if (secret !== void 0)
        abytes3(secret, Fn.BYTES, "secret");
      if (coeffs !== void 0)
        aarray(coeffs, "coeffs");
      if (typeof rng !== "function")
        throw new TypeError('"rng" expected function, got type=' + typeof rng);
      const secretScalar = secret === void 0 ? randomScalar(rng) : Fn.fromBytes(secret);
      if (!coeffs) {
        coeffs = [];
        for (let i = 0; i < signers.min - 1; i++)
          coeffs.push(randomScalar(rng));
      }
      if (coeffs.length !== signers.min - 1)
        throw new Error("wrong coefficients length");
      const coefficients = [secretScalar, ...coeffs];
      const commitment = coefficients.map((i) => Point.BASE.multiply(i));
      return { coefficients, commitment, secret: secretScalar };
    };
    const ProofOfKnowledge = {
      challenge: (id, verKey, R) => HDKG(concatBytes2(Fn.toBytes(id), serializePoint(verKey), serializePoint(R))),
      compute(id, coefficents, commitments, rng = randomBytes2) {
        if (coefficents.length < 1)
          throw new Error("coefficients should have at least one element");
        const { point: R, scalar: k } = genPointScalarPair(rng);
        const verKey = commitments[0];
        const c = this.challenge(id, verKey, R);
        const mu = Fn.add(k, Fn.mul(coefficents[0], c));
        return Signature.encode(R, mu);
      },
      validate(id, commitment, proof) {
        if (commitment.length < 1)
          throw new Error("commitment should have at least one element");
        const { R, z } = Signature.decode(proof);
        const phi = parsePoint(commitment[0]);
        const c = this.challenge(id, phi, R);
        if (!R.equals(Point.BASE.multiplyUnsafe(z).subtract(phi.multiplyUnsafe(c))))
          throw new Error("invalid proof of knowledge");
      }
    };
    const Basic = {
      challenge: (R, PK, msg) => {
        if (challenge2)
          return challenge2(R, PK, msg);
        return H2(concatBytes2(serializePoint(R), serializePoint(PK), msg));
      },
      sign(msg, sk, rng = randomBytes2) {
        const { point: R, scalar: r } = genPointScalarPair(rng);
        const PK = Point.BASE.multiply(sk);
        const c = this.challenge(R, PK, msg);
        const z = Fn.add(r, Fn.mul(c, sk));
        return [R, z];
      },
      verify(msg, R, z, PK) {
        if (adjustPointHook)
          PK = adjustPointHook(PK);
        if (adjustPointHook)
          R = adjustPointHook(R);
        const c = this.challenge(R, PK, msg);
        const zB = Point.BASE.multiplyUnsafe(z);
        const cA = PK.multiplyUnsafe(c);
        let check15 = zB.subtract(cA).subtract(R);
        if (check15.clearCofactor)
          check15 = check15.clearCofactor();
        return Point.ZERO.equals(check15);
      }
    };
    const validateSecretShare = (identifier, commitment, signingShare) => {
      if (!Point.BASE.multiply(signingShare).equals(evalutateVSS(identifier, commitment)))
        throw new Error("invalid secret share");
    };
    const Identifier = {
      fromNumber(n) {
        if (!Number.isSafeInteger(n))
          throw new Error("expected safe interger");
        return serializeIdentifier(BigInt(n));
      },
      // Not in spec, but in FROST implementation,
      // seems useful and nice, no need to sync identifiers (would require more interactions)
      derive(s) {
        astring(s, "s");
        return serializeIdentifier(HID(utf8ToBytes2(s)));
      }
    };
    const generateNonce = (secret, rng = randomBytes2) => H3(concatBytes2(rng(32), Fn.toBytes(secret)));
    const getGroupCommitment = (GPK, commitmentList, msg) => {
      const CL = commitmentList.map((i) => [
        i.identifier,
        parseIdentifier(i.identifier),
        parsePoint(i.hiding),
        parsePoint(i.binding)
      ]);
      CL.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
      const Cbytes = [];
      for (const [_, id, hC, bC] of CL)
        Cbytes.push(Fn.toBytes(id), serializePoint(hC), serializePoint(bC));
      const encodedCommitmentHash = H5(concatBytes2(...Cbytes));
      const rhoPrefix = concatBytes2(serializePoint(GPK), H4(msg), encodedCommitmentHash);
      const bindingFactors = {};
      for (const [i, id] of CL) {
        bindingFactors[i] = H1(concatBytes2(rhoPrefix, Fn.toBytes(id)));
      }
      let hidingSum = Point.ZERO;
      const points = [];
      const scalars = [];
      for (const [i, _, hC, bC] of CL) {
        if (Point.ZERO.equals(hC) || Point.ZERO.equals(bC))
          throw new Error("infinity commitment");
        hidingSum = hidingSum.add(hC);
        points.push(bC);
        scalars.push(bindingFactors[i]);
      }
      const groupCommitment = hidingSum.add(msm(points, scalars));
      const identifiers = CL.map((i) => i[1]);
      return { identifiers, groupCommitment, bindingFactors };
    };
    const prepareShare = (PK, commitmentList, msg, identifier) => {
      const GPK = adjustPoint(parsePoint(PK));
      const id = parseIdentifier(identifier);
      const { identifiers, groupCommitment, bindingFactors } = getGroupCommitment(GPK, commitmentList, msg);
      const bindingFactor = bindingFactors[identifier];
      const lambda = deriveInterpolatingValue(identifiers, id);
      const challenge3 = Basic.challenge(groupCommitment, GPK, msg);
      return { lambda, challenge: challenge3, bindingFactor, groupCommitment };
    };
    Object.freeze(Identifier);
    const frost = {
      Identifier,
      // DKG is Distributed Key Generation, not Trusted Dealer Key Generation.
      DKG: Object.freeze({
        // NOTE: we allow to pass secret scalar from user side,
        // this way it can be derived, instead of random generation
        round1: (id, signers, secret, rng = randomBytes2) => {
          const idNum = parseIdentifier(id, "id");
          validateSigners(signers);
          const { coefficients, commitment } = generateSecretPolynomial(signers, secret, void 0, rng);
          const proofOfKnowledge = ProofOfKnowledge.compute(idNum, coefficients, commitment, rng);
          const commitmentBytes = commitment.map(serializePoint);
          const round1Public = {
            identifier: serializeIdentifier(idNum),
            commitment: commitmentBytes,
            proofOfKnowledge
          };
          const round1Secret = {
            identifier: idNum,
            coefficients,
            commitment: commitment.map(serializePoint),
            // Copy threshold metadata instead of retaining the caller-owned object by reference.
            signers: { min: signers.min, max: signers.max },
            step: 1
          };
          return { public: round1Public, secret: round1Secret };
        },
        round2: (secret, others) => {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          validateSigners(secret.signers, "secret.signers");
          aarray(others, "others");
          if (others.length !== secret.signers.max - 1)
            throw new Error("wrong number of round1 packages");
          if (!secret.coefficients || secret.step === 3)
            throw new Error("round3 package used in round2");
          const authenticatedRound1 = canonicalRound1Packages(others);
          if (secret.round2Cache !== void 0) {
            if (secret.round1Cache === void 0 || !equalRound1Transcripts(secret.round1Cache, authenticatedRound1))
              throw new Error("round1 packages do not match authenticated transcript");
            return secret.round2Cache;
          }
          const res = {};
          for (const p of authenticatedRound1) {
            if (p.commitment.length !== secret.signers.min)
              throw new Error("wrong number of commitments");
            const id = parseIdentifier(p.identifier);
            if (id === secret.identifier)
              throw new Error("duplicate id=" + serializeIdentifier(id));
            ProofOfKnowledge.validate(id, p.commitment, p.proofOfKnowledge);
            for (const c of p.commitment)
              parsePoint(c);
            if (res[p.identifier])
              throw new Error("Duplicate id=" + id);
            const signingShare = Fn.toBytes(polynomialEvaluate(id, secret.coefficients));
            res[p.identifier] = {
              identifier: serializeIdentifier(secret.identifier),
              signingShare
            };
          }
          secret.round1Cache = authenticatedRound1;
          secret.round2Cache = res;
          secret.step = 2;
          return res;
        },
        round3: (secret, round1, round2) => {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          validateSigners(secret.signers, "secret.signers");
          aarray(round1, "round1");
          aarray(round2, "round2");
          if (round1.length !== secret.signers.max - 1)
            throw new Error("wrong length of round1 packages");
          if (!secret.coefficients || secret.step !== 2 || !secret.round1Cache)
            throw new Error("round2 package used in round3");
          const suppliedRound1 = canonicalRound1Packages(round1);
          const authenticatedRound1 = secret.round1Cache;
          if (!equalRound1Transcripts(authenticatedRound1, suppliedRound1))
            throw new Error("round1 packages do not match authenticated transcript");
          if (round2.length !== authenticatedRound1.length)
            throw new Error("wrong length of round2 packages");
          const merged = {};
          for (const r1 of authenticatedRound1) {
            if (!r1.identifier || !r1.commitment)
              throw new Error("wrong round1 share");
            merged[r1.identifier] = { ...r1 };
          }
          for (const r2 of round2) {
            if (!r2.identifier || !r2.signingShare)
              throw new Error("wrong round2 share");
            if (!merged[r2.identifier])
              throw new Error("round1 share for " + r2.identifier + " is missing");
            merged[r2.identifier].signingShare = r2.signingShare;
          }
          if (Object.keys(merged).length !== authenticatedRound1.length)
            throw new Error("mismatch identifiers between rounds");
          let signingShare = Fn.ZERO;
          if (secret.commitment.length !== secret.signers.min)
            throw new Error("wrong commitments length");
          const localCommitment = secret.commitment.map(parsePoint);
          const localShare = polynomialEvaluate(secret.identifier, secret.coefficients);
          validateSecretShare(secret.identifier, localCommitment, localShare);
          const localCommitmentBytes = localCommitment.map(serializePoint);
          const commitments = {
            [serializeIdentifier(secret.identifier)]: localCommitmentBytes
          };
          for (const k in merged) {
            const v = merged[k];
            if (!v.signingShare || !v.commitment)
              throw new Error("mismatch identifiers");
            const id = parseIdentifier(k);
            const signingSharePart = Fn.fromBytes(v.signingShare);
            const commitment = v.commitment.map(parsePoint);
            validateSecretShare(secret.identifier, commitment, signingSharePart);
            signingShare = Fn.add(signingShare, signingSharePart);
            const idSer = serializeIdentifier(id);
            if (commitments[idSer])
              throw new Error("duplicated id=" + idSer);
            commitments[idSer] = v.commitment;
          }
          signingShare = Fn.add(signingShare, localShare);
          const mergedCommitment = new Array(secret.signers.min).fill(Point.ZERO);
          for (const k in commitments) {
            const v = commitments[k];
            if (v.length !== secret.signers.min)
              throw new Error("wrong commitments length");
            for (let i = 0; i < v.length; i++)
              mergedCommitment[i] = mergedCommitment[i].add(parsePoint(v[i]));
          }
          const mergedCommitmentBytes = mergedCommitment.map(serializePoint);
          const verifyingShares = {};
          for (const k in commitments)
            verifyingShares[k] = serializePoint(evalutateVSS(parseIdentifier(k), mergedCommitment));
          let res = {
            public: {
              signers: { min: secret.signers.min, max: secret.signers.max },
              commitments: mergedCommitmentBytes,
              verifyingShares: Object.fromEntries(Object.entries(verifyingShares).map(([k, v]) => [k, v.slice()]))
            },
            secret: {
              identifier: serializeIdentifier(secret.identifier),
              signingShare: Fn.toBytes(signingShare)
            }
          };
          if (adjustDKG)
            res = adjustDKG(res);
          for (let i = 0; i < secret.coefficients.length; i++)
            secret.coefficients[i] -= secret.coefficients[i];
          delete secret.coefficients;
          delete secret.round1Cache;
          delete secret.round2Cache;
          secret.step = 3;
          return res;
        },
        clean(secret) {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          secret.identifier -= secret.identifier;
          if (secret.coefficients) {
            for (let i = 0; i < secret.coefficients.length; i++)
              secret.coefficients[i] -= secret.coefficients[i];
          }
          delete secret.round1Cache;
          delete secret.round2Cache;
          secret.step = 3;
        }
      }),
      // Trusted dealer setup
      // Generates keys for all participants
      trustedDealer(signers, identifiers, secret, rng = randomBytes2) {
        validateSigners(signers);
        if (identifiers === void 0) {
          identifiers = [];
          for (let i = 1; i <= signers.max; i++)
            identifiers.push(Identifier.fromNumber(i));
        } else {
          aarray(identifiers, "identifiers");
          if (identifiers.length !== signers.max)
            throw new Error("identifiers should be array of " + signers.max);
        }
        const identifierNums = {};
        for (const id of identifiers) {
          const idNum = parseIdentifier(id);
          if (id in identifierNums)
            throw new Error("duplicated id=" + id);
          identifierNums[id] = idNum;
        }
        const sp = generateSecretPolynomial(signers, secret, void 0, rng);
        const commitmentBytes = sp.commitment.map(serializePoint);
        const secretShares = {};
        const verifyingShares = {};
        for (const id of identifiers) {
          const signingShare = polynomialEvaluate(identifierNums[id], sp.coefficients);
          verifyingShares[id] = serializePoint(Point.BASE.multiply(signingShare));
          secretShares[id] = {
            identifier: id,
            signingShare: Fn.toBytes(signingShare)
          };
        }
        return {
          public: {
            signers: { min: signers.min, max: signers.max },
            commitments: commitmentBytes,
            verifyingShares
          },
          secretShares
        };
      },
      // Validate secret (from trusted dealer or DKG)
      validateSecret(secret, pub) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes3(secret.signingShare, Fn.BYTES, "secret.signingShare");
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        const id = parseIdentifier(secret.identifier);
        const commitment = pub.commitments.map(parsePoint);
        const signingShare = Fn.fromBytes(secret.signingShare);
        validateSecretShare(id, commitment, signingShare);
      },
      // Actual signing
      // Round 1: each participant commit to nonces
      // Nonces kept private, commitments sent to coordinator (or every other participant)
      // NOTE: we don't need the message at this point, which lets a coordinator
      // keep multiple nonce commitments per participant in advance and skip
      // round1 for signing.
      // But then each participant needs to remember generated shares
      commit(secret, rng = randomBytes2) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes3(secret.signingShare, Fn.BYTES, "secret.signingShare");
        if (typeof rng !== "function")
          throw new TypeError('"rng" expected function, got type=' + typeof rng);
        const secretScalar = Fn.fromBytes(secret.signingShare);
        const hiding = generateNonce(secretScalar, rng);
        const binding = generateNonce(secretScalar, rng);
        const nonces = { hiding: Fn.toBytes(hiding), binding: Fn.toBytes(binding) };
        return { nonces, commitments: nonceCommitments(secret.identifier, nonces) };
      },
      // Round2: sign. Each participant creates a signature share from the secret
      // and the selected nonce commitments.
      signShare(secret, pub, nonces, commitmentList, msg) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes3(secret.signingShare, Fn.BYTES, "secret.signingShare");
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        validateObject(nonces, { hiding: "object", binding: "object" }, {}, "nonces");
        abytes3(nonces.hiding, Fn.BYTES, "nonces.hiding");
        abytes3(nonces.binding, Fn.BYTES, "nonces.binding");
        aarray(commitmentList, "commitmentList");
        abytes3(msg, void 0, "msg");
        validateCommitmentsNum(pub.signers, commitmentList.length);
        const hidingNonce0 = Fn.fromBytes(nonces.hiding);
        const bindingNonce0 = Fn.fromBytes(nonces.binding);
        if (Fn.is0(hidingNonce0) || Fn.is0(bindingNonce0))
          throw new Error("signing nonces already used");
        const expectedCommitment = {
          identifier: secret.identifier,
          hiding: serializePoint(Point.BASE.multiply(hidingNonce0)),
          binding: serializePoint(Point.BASE.multiply(bindingNonce0))
        };
        const commitment = commitmentList.find((i) => i.identifier === secret.identifier);
        if (!commitment)
          throw new Error("missing signer commitment");
        if (bytesToHex2(commitment.hiding) !== bytesToHex2(expectedCommitment.hiding) || bytesToHex2(commitment.binding) !== bytesToHex2(expectedCommitment.binding))
          throw new Error("incorrect signer commitment");
        if (adjustSecret)
          secret = adjustSecret(secret, pub);
        if (adjustPublic)
          pub = adjustPublic(pub);
        const SK = Fn.fromBytes(secret.signingShare);
        const { lambda, challenge: challenge3, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, secret.identifier);
        const N = adjustNonces ? adjustNonces(groupCommitment, nonces) : nonces;
        const hidingNonce = adjustNonces ? Fn.fromBytes(N.hiding) : hidingNonce0;
        const bindingNonce = adjustNonces ? Fn.fromBytes(N.binding) : bindingNonce0;
        const t = Fn.mul(Fn.mul(lambda, SK), challenge3);
        const t2 = Fn.mul(bindingNonce, bindingFactor);
        const r = Fn.toBytes(Fn.add(Fn.add(hidingNonce, t2), t));
        nonces.hiding.fill(0);
        nonces.binding.fill(0);
        return r;
      },
      // Each participant (or coordinator) can verify signatures from other participants
      verifyShare(pub, commitmentList, msg, identifier, sigShare) {
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        aarray(commitmentList, "commitmentList");
        abytes3(msg, void 0, "msg");
        parseIdentifier(identifier);
        abytes3(sigShare, Fn.BYTES, "sigShare");
        if (adjustPublic)
          pub = adjustPublic(pub);
        const comm = commitmentList.find((i) => i.identifier === identifier);
        if (!comm)
          throw new Error("cannot find identifier commitment");
        const PK = parsePoint(pub.verifyingShares[identifier]);
        const hidingNonceCommitment = parsePoint(comm.hiding);
        const bindingNonceCommitment = parsePoint(comm.binding);
        const { lambda, challenge: challenge3, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, identifier);
        let commShare = hidingNonceCommitment.add(bindingNonceCommitment.multiplyUnsafe(bindingFactor));
        if (adjustGroupCommitmentShare)
          commShare = adjustGroupCommitmentShare(groupCommitment, commShare);
        const l = Point.BASE.multiplyUnsafe(Fn.fromBytes(sigShare));
        const r = commShare.add(PK.multiplyUnsafe(Fn.mul(challenge3, lambda)));
        return l.equals(r);
      },
      // Aggregate multiple signature shares into groupSignature
      aggregate(pub, commitmentList, msg, sigShares) {
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        aarray(commitmentList, "commitmentList");
        abytes3(msg, void 0, "msg");
        validateObject(sigShares, {}, {}, "sigShares");
        const rawPub = pub;
        if (adjustPublic)
          pub = adjustPublic(pub);
        try {
          validateCommitmentsNum(pub.signers, commitmentList.length);
        } catch {
          throw new AggErr("aggregation failed", []);
        }
        const ids = commitmentList.map((i) => i.identifier);
        const seen = /* @__PURE__ */ new Set();
        for (const id of ids) {
          if (seen.has(id))
            throw new AggErr("aggregation failed", []);
          seen.add(id);
        }
        if (ids.length !== Object.keys(sigShares).length)
          throw new AggErr("aggregation failed", []);
        for (const id of ids) {
          if (!(id in sigShares) || !(id in pub.verifyingShares))
            throw new AggErr("aggregation failed", []);
        }
        const GPK = parsePoint(pub.commitments[0]);
        const { groupCommitment } = getGroupCommitment(GPK, commitmentList, msg);
        let z = Fn.ZERO;
        for (const id of ids)
          z = Fn.add(z, Fn.fromBytes(sigShares[id]));
        if (!Basic.verify(msg, groupCommitment, z, GPK)) {
          const cheaters = [];
          for (const id of ids) {
            if (!this.verifyShare(rawPub, commitmentList, msg, id, sigShares[id]))
              cheaters.push(id);
          }
          throw new AggErr("aggregation failed", cheaters);
        }
        return Signature.encode(groupCommitment, z);
      },
      // Basic sign/verify using single key
      sign(msg, secretKey) {
        let sk = Fn.fromBytes(secretKey);
        if (adjustScalar)
          sk = adjustScalar(sk);
        const [R, z] = Basic.sign(msg, sk);
        return Signature.encode(R, z);
      },
      verify(sig, msg, publicKey) {
        const PK = parsePublicKey ? validatePublicPoint(parsePublicKey(publicKey)) : parsePoint(publicKey);
        const { R, z } = Signature.decode(sig);
        return Basic.verify(msg, R, z, PK);
      },
      // Combine multiple secret shares to restore secret
      combineSecret(shares, signers) {
        aarray(shares, "shares");
        validateSigners(signers);
        if (shares.length < signers.min || shares.length > signers.max)
          throw new Error("wrong secret shares array");
        const points = [];
        const seen = {};
        for (const s of shares) {
          const idNum = parseIdentifier(s.identifier);
          const id = serializeIdentifier(idNum);
          if (seen[id])
            throw new Error("duplicated id=" + id);
          seen[id] = true;
          points.push([idNum, Fn.fromBytes(s.signingShare)]);
        }
        const xCoords = points.map(([x]) => x);
        let res = Fn.ZERO;
        for (const [x, y] of points)
          res = Fn.add(res, Fn.mul(y, deriveInterpolatingValue(xCoords, x)));
        return Fn.toBytes(res);
      },
      // Utils
      utils: Object.freeze({
        Fn,
        // NOTE: we re-export it here because it may be different from Point.Fn (ed448 is fun!)
        // Test RNG overrides still go through noble's non-zero scalar derivation; this is not a raw
        // "bytes become scalar" escape hatch.
        randomScalar: (rng = randomBytes2) => Fn.toBytes(genPointScalarPair(rng).scalar),
        generateSecretPolynomial: (signers, secret, coeffs, rng) => {
          const res = generateSecretPolynomial(signers, secret, coeffs, rng);
          return { ...res, commitment: res.commitment.map(serializePoint) };
        }
      })
    };
    return Object.freeze(frost);
  }
  var validateSigners, validateCommitmentsNum, AggErr;
  var init_frost = __esm({
    "node_modules/@noble/curves/abstract/frost.js"() {
      init_utils();
      init_utils2();
      init_curve();
      init_fft();
      init_modular();
      validateSigners = (signers, title = "signers") => {
        validateObject(signers, { min: "number", max: "number" }, {}, title);
        asafenumber(signers.min, title + ".min");
        asafenumber(signers.max, title + ".max");
        if (signers.min < 2 || signers.max < 2 || signers.min > signers.max)
          throw new Error("Wrong signers info: min=" + signers.min + " max=" + signers.max);
      };
      validateCommitmentsNum = (signers, len) => {
        if (len < signers.min || len > signers.max)
          throw new Error("Wrong number of commitments=" + len);
      };
      AggErr = class extends Error {
        constructor(msg, cheaters) {
          super(msg);
          // Empty means aggregation failed before per-share verification could attribute a signer.
          __publicField(this, "cheaters");
          this.cheaters = cheaters;
        }
      };
    }
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/hmac.js
  var _HMAC, hmac;
  var init_hmac = __esm({
    "node_modules/@noble/curves/node_modules/@noble/hashes/hmac.js"() {
      init_utils();
      _HMAC = class {
        constructor(hash, key) {
          __publicField(this, "oHash");
          __publicField(this, "iHash");
          __publicField(this, "blockLen");
          __publicField(this, "outputLen");
          __publicField(this, "canXOF", false);
          __publicField(this, "finished", false);
          __publicField(this, "destroyed", false);
          ahash(hash);
          abytes2(key, void 0, "key");
          this.iHash = hash.create();
          if (typeof this.iHash.update !== "function")
            throw new Error("expected Hash instance");
          this.blockLen = this.iHash.blockLen;
          this.outputLen = this.iHash.outputLen;
          const blockLen = this.blockLen;
          const pad = new Uint8Array(blockLen);
          pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
          for (let i = 0; i < pad.length; i++)
            pad[i] ^= 54;
          this.iHash.update(pad);
          this.oHash = hash.create();
          for (let i = 0; i < pad.length; i++)
            pad[i] ^= 54 ^ 92;
          this.oHash.update(pad);
          clean2(pad);
        }
        update(buf) {
          aexists2(this);
          this.iHash.update(buf);
          return this;
        }
        digestInto(out) {
          aexists2(this);
          aoutput2(out, this);
          this.finished = true;
          const buf = out.subarray(0, this.outputLen);
          this.iHash.digestInto(buf);
          this.oHash.update(buf);
          this.oHash.digestInto(buf);
          this.destroy();
        }
        digest() {
          const out = new Uint8Array(this.oHash.outputLen);
          this.digestInto(out);
          return out;
        }
        _cloneInto(to) {
          to || (to = Object.create(Object.getPrototypeOf(this), {}));
          const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
          to = to;
          to.finished = finished;
          to.destroyed = destroyed;
          to.blockLen = blockLen;
          to.outputLen = outputLen;
          to.canXOF = canXOF;
          to.oHash = oHash._cloneInto(to.oHash);
          to.iHash = iHash._cloneInto(to.iHash);
          return to;
        }
        clone() {
          return this._cloneInto();
        }
        destroy() {
          this.destroyed = true;
          this.oHash.destroy();
          this.iHash.destroy();
        }
      };
      hmac = /* @__PURE__ */ (() => {
        const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
        hmac_.create = (hash, key) => new _HMAC(hash, key);
        return hmac_;
      })();
    }
  });

  // node_modules/@noble/curves/abstract/der.js
  var _0n5, DERErr, _DER, DER;
  var init_der = __esm({
    "node_modules/@noble/curves/abstract/der.js"() {
      init_utils2();
      _0n5 = /* @__PURE__ */ BigInt(0);
      DERErr = class extends Error {
        constructor(m = "") {
          super(m);
        }
      };
      _DER = {
        // asn.1 DER encoding utils
        Err: DERErr,
        // Basic building block is TLV (Tag-Length-Value)
        _tlv: {
          encode: (tag, data) => {
            const { Err: E } = _DER;
            asafenumber(tag, "tag");
            if (tag < 0 || tag > 255)
              throw new E("tlv.encode: wrong tag");
            astring(data, "data");
            if (data.length & 1)
              throw new E("tlv.encode: unpadded data");
            const dataLen = data.length / 2;
            const len = numberToHexUnpadded(dataLen);
            if (len.length / 2 & 128)
              throw new E("tlv.encode: long form length too big");
            const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
            const t = numberToHexUnpadded(tag);
            return t + lenLen + len + data;
          },
          // v - value, l - left bytes (unparsed)
          decode(tag, data) {
            const { Err: E } = _DER;
            data = abytes3(data, void 0, "DER data");
            let pos = 0;
            if (tag < 0 || tag > 255)
              throw new E("tlv.decode: wrong tag");
            if (data.length < 2 || data[pos++] !== tag)
              throw new E("tlv.decode: wrong tlv");
            const first = data[pos++];
            const isLong = !!(first & 128);
            let length2 = 0;
            if (!isLong)
              length2 = first;
            else {
              const lenLen = first & 127;
              if (!lenLen)
                throw new E("tlv.decode(long): indefinite length not supported");
              if (lenLen > 4)
                throw new E("tlv.decode(long): byte length is too big");
              const lengthBytes = data.subarray(pos, pos + lenLen);
              if (lengthBytes.length !== lenLen)
                throw new E("tlv.decode: length bytes not complete");
              if (lengthBytes[0] === 0)
                throw new E("tlv.decode(long): zero leftmost byte");
              for (const b of lengthBytes)
                length2 = length2 << 8 | b;
              pos += lenLen;
              if (length2 < 128)
                throw new E("tlv.decode(long): not minimal encoding");
            }
            const v = data.subarray(pos, pos + length2);
            if (v.length !== length2)
              throw new E("tlv.decode: wrong value length");
            return { v, l: data.subarray(pos + length2) };
          }
        },
        // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
        // since we always use positive integers here. It must always be empty:
        // - add zero byte if exists
        // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
        _int: {
          encode(num2) {
            const { Err: E } = _DER;
            abignumber(num2);
            if (num2 < _0n5)
              throw new E("integer: negative integers are not allowed");
            let hex = numberToHexUnpadded(num2);
            if (Number.parseInt(hex[0], 16) & 8)
              hex = "00" + hex;
            if (hex.length & 1)
              throw new E("unexpected DER parsing assertion: unpadded hex");
            return hex;
          },
          decode(data) {
            const { Err: E } = _DER;
            if (data.length < 1)
              throw new E("invalid signature integer: empty");
            if (data[0] & 128)
              throw new E("invalid signature integer: negative");
            if (data.length > 1 && data[0] === 0 && !(data[1] & 128))
              throw new E("invalid signature integer: unnecessary leading zero");
            return bytesToNumberBE(data);
          }
        },
        toSig(bytes, maxScalarBytes) {
          const { Err: E, _int: int, _tlv: tlv } = _DER;
          if (maxScalarBytes !== void 0) {
            asafenumber(maxScalarBytes, "maxScalarBytes");
            if (maxScalarBytes < 1)
              throw new E("invalid signature: maxScalarBytes must be positive");
          }
          const data = abytes3(bytes, void 0, "signature");
          const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
          if (seqLeftBytes.length)
            throw new E("invalid signature: left bytes after parsing");
          const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
          const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
          if (sLeftBytes.length)
            throw new E("invalid signature: left bytes after parsing");
          if (maxScalarBytes !== void 0 && (rBytes.length > maxScalarBytes || sBytes.length > maxScalarBytes))
            throw new E("invalid signature: integer too large");
          return { r: int.decode(rBytes), s: int.decode(sBytes) };
        },
        hexFromSig(sig) {
          const { _tlv: tlv, _int: int } = _DER;
          validateObject(sig, { r: "bigint", s: "bigint" }, {}, "sig");
          const rs = tlv.encode(2, int.encode(sig.r));
          const ss = tlv.encode(2, int.encode(sig.s));
          const seq = rs + ss;
          return tlv.encode(48, seq);
        }
      };
      DER = /* @__PURE__ */ (() => {
        Object.freeze(_DER._tlv);
        Object.freeze(_DER._int);
        return Object.freeze(_DER);
      })();
    }
  });

  // node_modules/@noble/curves/abstract/weierstrass.js
  function _splitEndoScalar(k, basis, n) {
    aInRange("scalar", k, _0n6, n);
    const [[a1, b1], [a2, b2]] = basis;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = k - c1 * a1 - c2 * a2;
    let k2 = -c1 * b1 - c2 * b2;
    const k1neg = k1 < _0n6;
    const k2neg = k2 < _0n6;
    if (k1neg)
      k1 = -k1;
    if (k2neg)
      k2 = -k2;
    const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n5;
    if (k1 < _0n6 || k1 >= MAX_NUM || k2 < _0n6 || k2 >= MAX_NUM) {
      throw new Error("splitScalar (endomorphism): failed for k");
    }
    return { k1neg, k1, k2neg, k2 };
  }
  function validateSigFormat(format) {
    if (!["compact", "recovered", "der"].includes(format))
      throw new Error('Signature format must be "compact", "recovered", or "der"');
    return format;
  }
  function validateSigOpts(opts, def) {
    validateObject(opts);
    const optsn = {};
    for (let optName of Object.keys(def)) {
      optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
    }
    abool(optsn.lowS, "lowS");
    abool(optsn.prehash, "prehash");
    if (optsn.format !== void 0)
      validateSigFormat(optsn.format);
    return optsn;
  }
  function weierstrass(params, extraOpts = {}) {
    const validated = createCurveFields("weierstrass", params, extraOpts);
    const Fp = validated.Fp;
    const Fn = validated.Fn;
    let CURVE = validated.CURVE;
    const { h: cofactor, n: CURVE_ORDER } = CURVE;
    validateObject(extraOpts, {}, {
      allowInfinityPoint: "boolean",
      clearCofactor: "function",
      isTorsionFree: "function",
      fromBytes: "function",
      toBytes: "function",
      endo: "object",
      randomBytes: "function"
    });
    const { endo: endoOpts, allowInfinityPoint, clearCofactor, isTorsionFree, fromBytes, toBytes: toBytes2 } = extraOpts;
    const randomBytes3 = extraOpts.randomBytes === void 0 ? randomBytes2 : extraOpts.randomBytes;
    if (endoOpts) {
      if (!Fp.is0(CURVE.a) || typeof endoOpts.beta !== "bigint" || !Array.isArray(endoOpts.basises)) {
        throw new Error('invalid endo: expected "beta": bigint and "basises": array');
      }
    }
    const endo = endoOpts ? {
      beta: endoOpts.beta,
      basises: endoOpts.basises.map((basis) => [...basis])
    } : void 0;
    const lengths = getWLengths(Fp, Fn);
    function assertCompressionIsSupported() {
      if (!Fp.isOdd)
        throw new Error("compression is not supported: Field does not have .isOdd()");
    }
    function pointToBytes2(_c, point, isCompressed) {
      if (point.is0()) {
        if (!allowInfinityPoint)
          throw new Error("bad point: ZERO");
        return Uint8Array.of(0);
      }
      const { x, y } = point.toAffine();
      const bx = Fp.toBytes(x);
      abool(isCompressed, "isCompressed");
      if (isCompressed) {
        assertCompressionIsSupported();
        const hasEvenY = !Fp.isOdd(y);
        return concatBytes2(pprefix(hasEvenY), bx);
      } else {
        return concatBytes2(Uint8Array.of(4), bx, Fp.toBytes(y));
      }
    }
    function pointFromBytes(bytes) {
      abytes3(bytes, void 0, "Point");
      const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
      const length2 = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      if (allowInfinityPoint && length2 === 1 && head === 0)
        return { x: Fp.ZERO, y: Fp.ZERO };
      if (length2 === comp && (head === 2 || head === 3)) {
        const x = Fp.fromBytes(tail);
        if (!Fp.isValid(x))
          throw new Error("bad point: is not on curve, wrong x");
        const y2 = weierstrassEquation(x);
        let y;
        try {
          y = Fp.sqrt(y2);
        } catch (sqrtError) {
          const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
          throw new Error("bad point: is not on curve, sqrt error" + err);
        }
        assertCompressionIsSupported();
        const evenY = Fp.isOdd(y);
        const evenH = (head & 1) === 1;
        if (evenH !== evenY)
          y = Fp.neg(y);
        return { x, y };
      } else if (length2 === uncomp && head === 4) {
        const L = Fp.BYTES;
        const x = Fp.fromBytes(tail.subarray(0, L));
        const y = Fp.fromBytes(tail.subarray(L, L * 2));
        if (!isValidXY(x, y))
          throw new Error("bad point: is not on curve");
        return { x, y };
      } else {
        throw new Error(`bad point: got length ${length2}, expected compressed=${comp} or uncompressed=${uncomp}`);
      }
    }
    const encodePoint = toBytes2 === void 0 ? pointToBytes2 : toBytes2;
    const decodePoint = fromBytes === void 0 ? pointFromBytes : fromBytes;
    const b3 = Fp.mul(CURVE.b, _3n3);
    const mulA = Fp.is0(CURVE.a) ? (_) => Fp.ZERO : (x) => Fp.mul(CURVE.a, x);
    function weierstrassEquation(x) {
      const x2 = Fp.sqr(x);
      const x3 = Fp.mul(x2, x);
      return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
    }
    function isValidXY(x, y) {
      const left = Fp.sqr(y);
      const right = weierstrassEquation(x);
      return Fp.eql(left, right);
    }
    if (!isValidXY(CURVE.Gx, CURVE.Gy))
      throw new Error("bad curve params: generator point");
    const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n3), _4n4);
    const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
    if (Fp.is0(Fp.add(_4a3, _27b2)))
      throw new Error("bad curve params: a or b");
    function acoord(title, n, banZero = false) {
      if (!Fp.isValid(n) || banZero && Fp.is0(n))
        throw new Error(`bad point coordinate ${title}`);
      return typeof n === "object" && n !== null ? Fp.create(n) : n;
    }
    function aprjpoint(other) {
      if (!(other instanceof Point))
        throw new Error("Weierstrass Point expected");
    }
    function splitEndoScalarN(k) {
      if (!endo || !endo.basises)
        throw new Error("no endo");
      return _splitEndoScalar(k, endo.basises, Fn.ORDER);
    }
    function pushWnafPair(points, scalars, p, k) {
      if (!Fn.isValid(k))
        throw new RangeError("invalid scalar: out of range");
      if (endo) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(k);
        const psi = new Point(Fp.mul(p.X, endo.beta), p.Y, p.Z);
        points.push(k1neg ? p.negate() : p, k2neg ? psi.negate() : psi);
        scalars.push(k1, k2);
      } else {
        points.push(p);
        scalars.push(k);
      }
    }
    const validityCache = /* @__PURE__ */ new WeakSet();
    const _Point = class _Point {
      /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
      constructor(X, Y, Z) {
        __publicField(this, "X");
        __publicField(this, "Y");
        __publicField(this, "Z");
        this.X = acoord("x", X);
        this.Y = acoord("y", Y, true);
        this.Z = acoord("z", Z);
        Object.freeze(this);
      }
      static CURVE() {
        return CURVE;
      }
      /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
      static fromAffine(p) {
        const { x, y } = p || {};
        if (!p || !Fp.isValid(x) || !Fp.isValid(y))
          throw new Error("invalid affine point");
        if (p instanceof _Point)
          throw new Error("projective point not allowed");
        if (Fp.is0(x) && Fp.is0(y))
          return _Point.ZERO;
        return new _Point(x, y, Fp.ONE);
      }
      static fromBytes(bytes) {
        const P = _Point.fromAffine(decodePoint(abytes3(bytes, void 0, "point")));
        P.assertValidity();
        return P;
      }
      static fromHex(hex) {
        return _Point.fromBytes(hexToBytes2(hex));
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      /**
       * @param isLazy - true will defer table computation until the first multiplication
       */
      precompute(windowSize = 6, isLazy = true) {
        wnaf.setWindowSize(this, windowSize);
        if (!isLazy)
          this.multiply(_3n3);
        return this;
      }
      // TODO: return `this`
      /** A point on curve is valid if it conforms to equation. */
      assertValidity() {
        const p = this;
        if (p.is0()) {
          if (allowInfinityPoint && Fp.is0(p.X) && Fp.eql(p.Y, Fp.ONE) && Fp.is0(p.Z))
            return;
          throw new Error("bad point: ZERO");
        }
        if (validityCache.has(p))
          return;
        const { x, y } = p.toAffine();
        if (!Fp.isValid(x) || !Fp.isValid(y))
          throw new Error("bad point: x or y not field elements");
        if (!isValidXY(x, y))
          throw new Error("bad point: equation left != right");
        if (!p.isTorsionFree())
          throw new Error("bad point: not in prime-order subgroup");
        validityCache.add(p);
      }
      hasEvenY() {
        const { y } = this.toAffine();
        if (!Fp.isOdd)
          throw new Error("Field doesn't support isOdd");
        return !Fp.isOdd(y);
      }
      /** Compare one point to another. */
      equals(other) {
        aprjpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
        const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
        return U1 && U2;
      }
      /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
      negate() {
        return new _Point(this.X, Fp.neg(this.Y), this.Z);
      }
      // Renes-Costello-Batina exception-free doubling formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 3
      // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
      double() {
        const { X: X1, Y: Y1, Z: Z1 } = this;
        let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
        let t0 = Fp.mul(X1, X1);
        let t1 = Fp.mul(Y1, Y1);
        let t2 = Fp.mul(Z1, Z1);
        let t3 = Fp.mul(X1, Y1);
        t3 = Fp.add(t3, t3);
        Z3 = Fp.mul(X1, Z1);
        Z3 = Fp.add(Z3, Z3);
        X3 = mulA(Z3);
        Y3 = Fp.mul(b3, t2);
        Y3 = Fp.add(X3, Y3);
        X3 = Fp.sub(t1, Y3);
        Y3 = Fp.add(t1, Y3);
        Y3 = Fp.mul(X3, Y3);
        X3 = Fp.mul(t3, X3);
        Z3 = Fp.mul(b3, Z3);
        t2 = mulA(t2);
        t3 = Fp.sub(t0, t2);
        t3 = mulA(t3);
        t3 = Fp.add(t3, Z3);
        Z3 = Fp.add(t0, t0);
        t0 = Fp.add(Z3, t0);
        t0 = Fp.add(t0, t2);
        t0 = Fp.mul(t0, t3);
        Y3 = Fp.add(Y3, t0);
        t2 = Fp.mul(Y1, Z1);
        t2 = Fp.add(t2, t2);
        t0 = Fp.mul(t2, t3);
        X3 = Fp.sub(X3, t0);
        Z3 = Fp.mul(t2, t1);
        Z3 = Fp.add(Z3, Z3);
        Z3 = Fp.add(Z3, Z3);
        return new _Point(X3, Y3, Z3);
      }
      // Renes-Costello-Batina exception-free addition formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 1
      // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
      add(other) {
        aprjpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
        let t0 = Fp.mul(X1, X2);
        let t1 = Fp.mul(Y1, Y2);
        let t2 = Fp.mul(Z1, Z2);
        let t3 = Fp.add(X1, Y1);
        let t4 = Fp.add(X2, Y2);
        t3 = Fp.mul(t3, t4);
        t4 = Fp.add(t0, t1);
        t3 = Fp.sub(t3, t4);
        t4 = Fp.add(X1, Z1);
        let t5 = Fp.add(X2, Z2);
        t4 = Fp.mul(t4, t5);
        t5 = Fp.add(t0, t2);
        t4 = Fp.sub(t4, t5);
        t5 = Fp.add(Y1, Z1);
        X3 = Fp.add(Y2, Z2);
        t5 = Fp.mul(t5, X3);
        X3 = Fp.add(t1, t2);
        t5 = Fp.sub(t5, X3);
        Z3 = mulA(t4);
        X3 = Fp.mul(b3, t2);
        Z3 = Fp.add(X3, Z3);
        X3 = Fp.sub(t1, Z3);
        Z3 = Fp.add(t1, Z3);
        Y3 = Fp.mul(X3, Z3);
        t1 = Fp.add(t0, t0);
        t1 = Fp.add(t1, t0);
        t2 = mulA(t2);
        t4 = Fp.mul(b3, t4);
        t1 = Fp.add(t1, t2);
        t2 = Fp.sub(t0, t2);
        t2 = mulA(t2);
        t4 = Fp.add(t4, t2);
        t0 = Fp.mul(t1, t4);
        Y3 = Fp.add(Y3, t0);
        t0 = Fp.mul(t5, t4);
        X3 = Fp.mul(t3, X3);
        X3 = Fp.sub(X3, t0);
        t0 = Fp.mul(t3, t1);
        Z3 = Fp.mul(t5, Z3);
        Z3 = Fp.add(Z3, t0);
        return new _Point(X3, Y3, Z3);
      }
      subtract(other) {
        aprjpoint(other);
        return this.add(other.negate());
      }
      is0() {
        return this.equals(_Point.ZERO);
      }
      /**
       * Constant time multiplication.
       * Uses precomputed tables (signed fixed-window wNAF) when available.
       * Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
       * @param scalar - by which the point would be multiplied
       * @returns New point
       */
      multiply(scalar) {
        if (!Fn.isValidNot0(scalar))
          throw new RangeError("invalid scalar: out of range");
        const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
        return normalize([p, f])[0];
      }
      /**
       * Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
       * when available (two half-width scalars sharing one halved doubling chain).
       * It's faster, but should only be used when you don't care about
       * an exposed secret key e.g. sig verification, which works over *public* keys.
       */
      multiplyUnsafe(scalar) {
        const p = this;
        const sc = scalar;
        if (!Fn.isValid(sc))
          throw new RangeError("invalid scalar: out of range");
        if (sc === _0n6 || p.is0())
          return _Point.ZERO;
        if (sc === _1n5)
          return p;
        if (wnaf.hasWindowSize(this))
          return wnaf.mulUnsafe(p, sc, normalize);
        const points = [];
        const scalars = [];
        pushWnafPair(points, scalars, p, sc);
        return mulAddUnsafe(_Point, points, scalars);
      }
      /**
       * Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
       * Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
       * (when available) halves the chain again by splitting each scalar into two half-width
       * parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
       * Only for public scalars.
       */
      mulAddUnsafe(a, other, b) {
        aprjpoint(other);
        const points = [];
        const scalars = [];
        pushWnafPair(points, scalars, this, a);
        pushWnafPair(points, scalars, other, b);
        return mulAddUnsafe(_Point, points, scalars);
      }
      /**
       * Converts Projective point to affine (x, y) coordinates.
       * (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
       * @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
       */
      toAffine(invertedZ) {
        const p = this;
        let iz = invertedZ;
        if (iz != null && !Fp.isValid(iz))
          throw new RangeError('"invertedZ" expected valid field element');
        const { X, Y, Z } = p;
        if (Fp.eql(Z, Fp.ONE))
          return { x: X, y: Y };
        const is0 = p.is0();
        if (iz == null)
          iz = is0 ? Fp.ONE : Fp.inv(Z);
        const x = Fp.mul(X, iz);
        const y = Fp.mul(Y, iz);
        const zz = Fp.mul(Z, iz);
        if (is0)
          return { x: Fp.ZERO, y: Fp.ZERO };
        if (!Fp.eql(zz, Fp.ONE))
          throw new Error("invZ was invalid");
        return { x, y };
      }
      /**
       * Checks whether Point is free of torsion elements (is in prime subgroup).
       * Always torsion-free for cofactor=1 curves.
       */
      isTorsionFree() {
        if (cofactor === _1n5)
          return true;
        if (isTorsionFree)
          return isTorsionFree(_Point, this);
        return wnaf.mulUnsafe(this, CURVE_ORDER).is0();
      }
      clearCofactor() {
        if (cofactor === _1n5)
          return this;
        if (clearCofactor)
          return clearCofactor(_Point, this);
        return this.multiplyUnsafe(cofactor);
      }
      isSmallOrder() {
        if (cofactor === _1n5)
          return this.is0();
        return this.clearCofactor().is0();
      }
      toBytes(isCompressed = true) {
        abool(isCompressed, "isCompressed");
        this.assertValidity();
        return encodePoint(_Point, this, isCompressed);
      }
      toHex(isCompressed = true) {
        return bytesToHex2(this.toBytes(isCompressed));
      }
      toString() {
        return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
      }
    };
    __publicField(_Point, "BASE", new _Point(CURVE.Gx, CURVE.Gy, Fp.ONE));
    __publicField(_Point, "ZERO", new _Point(Fp.ZERO, Fp.ONE, Fp.ZERO));
    __publicField(_Point, "Fp", Fp);
    __publicField(_Point, "Fn", Fn);
    let Point = _Point;
    const normalize = (points) => normalizeZ(Point, points);
    const wnaf = new ScalarMultiplier(Point, randomBytes3);
    if (wnaf.bits >= 6)
      Point.BASE.precompute(6);
    Object.freeze(Point.prototype);
    Object.freeze(Point);
    return Point;
  }
  function pprefix(hasEvenY) {
    return Uint8Array.of(hasEvenY ? 2 : 3);
  }
  function getWLengths(Fp, Fn) {
    return {
      secretKey: Fn.BYTES,
      publicKey: 1 + Fp.BYTES,
      publicKeyUncompressed: 1 + 2 * Fp.BYTES,
      publicKeyHasPrefix: true,
      // Raw compact `(r || s)` signature width; DER and recovered signatures use
      // different lengths outside this helper.
      signature: 2 * Fn.BYTES
    };
  }
  function ecdh(Point, ecdhOpts = {}) {
    validatePointCons(Point);
    const { Fn } = Point;
    const randomBytes_ = ecdhOpts.randomBytes === void 0 ? randomBytes2 : ecdhOpts.randomBytes;
    const lengths = Object.assign(getWLengths(Point.Fp, Fn), {
      seed: Math.max(getMinHashLength(Fn.ORDER), 16)
    });
    function isValidSecretKey(secretKey) {
      try {
        const num2 = Fn.fromBytes(secretKey);
        return Fn.isValidNot0(num2);
      } catch (error) {
        return false;
      }
    }
    function isValidPublicKey(publicKey, isCompressed) {
      const { publicKey: comp, publicKeyUncompressed } = lengths;
      try {
        const l = publicKey.length;
        if (isCompressed === true && l !== comp)
          return false;
        if (isCompressed === false && l !== publicKeyUncompressed)
          return false;
        return !Point.fromBytes(publicKey).is0();
      } catch (error) {
        return false;
      }
    }
    function randomSecretKey(seed) {
      seed = seed === void 0 ? randomBytes_(lengths.seed) : seed;
      return mapHashToField(abytes3(seed, lengths.seed, "seed"), Fn.ORDER);
    }
    function getPublicKey(secretKey, isCompressed = true) {
      return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
    }
    function isProbPub(item) {
      const { secretKey, publicKey, publicKeyUncompressed } = lengths;
      const allowedLengths = Fn._lengths;
      if (!isBytes3(item))
        return void 0;
      const l = abytes3(item, void 0, "key").length;
      const isPub = l === publicKey || l === publicKeyUncompressed;
      const isSec = l === secretKey || !!allowedLengths?.includes(l);
      if (isPub && isSec)
        return void 0;
      return isPub;
    }
    function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
      if (isProbPub(secretKeyA) === true)
        throw new Error("first arg must be private key");
      if (isProbPub(publicKeyB) === false)
        throw new Error("second arg must be public key");
      const s = Fn.fromBytes(secretKeyA);
      const b = Point.fromBytes(publicKeyB);
      if (b.is0())
        throw new Error("invalid public key: point at infinity");
      return b.multiply(s).toBytes(isCompressed);
    }
    const utils = {
      isValidSecretKey,
      isValidPublicKey,
      randomSecretKey
    };
    const keygen = createKeygen(randomSecretKey, getPublicKey);
    Object.freeze(utils);
    Object.freeze(lengths);
    return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
  }
  function ecdsa(Point, hash, ecdsaOpts = {}) {
    validatePointCons(Point);
    const hash_ = hash;
    ahash(hash_);
    validateObject(ecdsaOpts, {}, {
      hmac: "function",
      lowS: "boolean",
      randomBytes: "function",
      bits2int: "function",
      bits2int_modN: "function"
    });
    const opts = Object.assign({}, ecdsaOpts);
    const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
    const hmac2 = opts.hmac === void 0 ? (key, msg) => hmac(hash_, key, msg) : opts.hmac;
    const { Fp, Fn } = Point;
    const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
    const blindLength = getMinHashLength(CURVE_ORDER);
    const csprng = probeRandomBytes(randomBytes3, blindLength);
    const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, opts);
    const defaultSigOpts = {
      prehash: true,
      lowS: typeof opts.lowS === "boolean" ? opts.lowS : true,
      format: "compact",
      extraEntropy: false
    };
    const hasLargeRecoveryLifts = CURVE_ORDER * _2n3 + _1n5 < Fp.ORDER;
    function isBiggerThanHalfOrder(number2) {
      const HALF = CURVE_ORDER >> _1n5;
      return number2 > HALF;
    }
    function validateRS(title, num2) {
      if (!Fn.isValidNot0(num2))
        throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
      return num2;
    }
    function assertFieldSignIsSupported() {
      if (!Fp.isOdd)
        throw new Error("Field doesn't support isOdd");
    }
    function getRecoveryBit(x, y, r) {
      assertFieldSignIsSupported();
      return (x === r ? 0 : 2) | Number(Fp.isOdd(y));
    }
    function assertRecoverableCurve() {
      if (hasLargeRecoveryLifts)
        throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
    }
    function validateSigLength(bytes, format) {
      validateSigFormat(format);
      const size = lengths.signature;
      const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
      return abytes3(bytes, sizer);
    }
    class Signature {
      constructor(r, s, recovery) {
        __publicField(this, "r");
        __publicField(this, "s");
        __publicField(this, "recovery");
        this.r = validateRS("r", r);
        this.s = validateRS("s", s);
        if (recovery != null) {
          assertRecoverableCurve();
          if (![0, 1, 2, 3].includes(recovery))
            throw new Error("invalid recovery id");
          this.recovery = recovery;
        }
        Object.freeze(this);
      }
      static fromBytes(bytes, format = defaultSigOpts.format) {
        validateSigLength(bytes, format);
        let recid;
        if (format === "der") {
          if (bytes.length > 2 * Fn.BYTES + 16)
            throw new DER.Err("invalid signature: DER signature too long");
          const { r: r2, s: s2 } = DER.toSig(abytes3(bytes), Fn.BYTES + 1);
          return new Signature(r2, s2);
        }
        if (format === "recovered") {
          recid = bytes[0];
          format = "compact";
          bytes = bytes.subarray(1);
        }
        const L = lengths.signature / 2;
        const r = bytes.subarray(0, L);
        const s = bytes.subarray(L, L * 2);
        return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
      }
      static fromHex(hex, format) {
        return this.fromBytes(hexToBytes2(hex), format);
      }
      assertRecovery() {
        const { recovery } = this;
        if (recovery == null)
          throw new Error("invalid recovery id: must be present");
        return recovery;
      }
      addRecoveryBit(recovery) {
        return new Signature(this.r, this.s, recovery);
      }
      // Unlike the top-level helper below, this method expects a digest that has
      // already been hashed to the curve's message representative.
      recoverPublicKey(messageHash) {
        const { r, s } = this;
        const recovery = this.assertRecovery();
        const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER : r;
        if (!Fp.isValid(radj))
          throw new Error("invalid recovery id: sig.r+curve.n != R.x");
        const x = Fp.toBytes(radj);
        const R = Point.fromBytes(concatBytes2(pprefix((recovery & 1) === 0), x));
        const ir = Fn.inv(radj);
        const h2 = bits2int_modN(abytes3(messageHash, void 0, "msgHash"));
        const u1 = Fn.create(-h2 * ir);
        const u2 = Fn.create(s * ir);
        const Q = Point.BASE.mulAddUnsafe(u1, R, u2);
        if (Q.is0())
          throw new Error("invalid recovery: point at infinify");
        Q.assertValidity();
        return Q;
      }
      // Signatures should be low-s, to prevent malleability.
      hasHighS() {
        return isBiggerThanHalfOrder(this.s);
      }
      toBytes(format = defaultSigOpts.format) {
        validateSigFormat(format);
        if (format === "der")
          return hexToBytes2(DER.hexFromSig(this));
        const { r, s } = this;
        const rb = Fn.toBytes(r);
        const sb = Fn.toBytes(s);
        if (format === "recovered") {
          assertRecoverableCurve();
          return concatBytes2(Uint8Array.of(this.assertRecovery()), rb, sb);
        }
        return concatBytes2(rb, sb);
      }
      toHex(format) {
        return bytesToHex2(this.toBytes(format));
      }
    }
    Object.freeze(Signature.prototype);
    Object.freeze(Signature);
    const bits2int = opts.bits2int === void 0 ? function bits2int_def(bytes) {
      if (bytes.length > 8192)
        throw new Error("input is too large");
      const num2 = bytesToNumberBE(bytes);
      const delta = bytes.length * 8 - fnBits;
      return delta > 0 ? num2 >> BigInt(delta) : num2;
    } : opts.bits2int;
    const bits2int_modN = opts.bits2int_modN === void 0 ? function bits2int_modN_def(bytes) {
      return Fn.create(bits2int(bytes));
    } : opts.bits2int_modN;
    const ORDER_MASK = bitMask(fnBits);
    function int2octets(num2) {
      aInRange("num < 2^" + fnBits, num2, _0n6, ORDER_MASK);
      return Fn.toBytes(num2);
    }
    function validateMsgAndHash(message, prehash) {
      abytes3(message, void 0, "message");
      return prehash ? abytes3(hash_(message), void 0, "prehashed message") : message;
    }
    function prepSig(message, secretKey, opts2) {
      const { lowS, prehash, extraEntropy } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      const h1int = bits2int_modN(message);
      const d = Fn.fromBytes(secretKey);
      if (!Fn.isValidNot0(d))
        throw new Error("invalid private key");
      const seedArgs = [int2octets(d), int2octets(h1int)];
      if (extraEntropy != null && extraEntropy !== false) {
        const e = extraEntropy === true ? randomBytes3(lengths.secretKey) : extraEntropy;
        seedArgs.push(abytes3(e, void 0, "extraEntropy"));
      }
      const seed = concatBytes2(...seedArgs);
      const m = h1int;
      function k2sig(kBytes) {
        const k = bits2int(kBytes);
        if (!Fn.isValidNot0(k))
          return;
        const q = Point.BASE.multiply(k).toAffine();
        const r = Fn.create(q.x);
        if (r === _0n6)
          return;
        let s;
        if (csprng !== void 0) {
          const b = bytesToNumberBE(mapHashToField(csprng(blindLength), CURVE_ORDER));
          const ibk = Fn.inv(Fn.mul(b, k));
          const bm = Fn.mul(b, m);
          const bd = Fn.mul(b, d);
          s = Fn.create(ibk * Fn.create(bm + bd * r));
        } else {
          const ik = invertCt(k, CURVE_ORDER);
          s = Fn.create(ik * Fn.create(m + r * d));
        }
        if (s === _0n6)
          return;
        let recovery = getRecoveryBit(q.x, q.y, r);
        let normS = s;
        if (lowS && isBiggerThanHalfOrder(s)) {
          normS = Fn.neg(s);
          recovery ^= 1;
        }
        return new Signature(r, normS, hasLargeRecoveryLifts ? void 0 : recovery);
      }
      return { seed, k2sig };
    }
    function sign(message, secretKey, opts2 = {}) {
      const { seed, k2sig } = prepSig(message, secretKey, opts2);
      const drbg = createHmacDrbg(hash_.outputLen, Fn.BYTES, hmac2);
      const sig = drbg(seed, k2sig);
      return sig.toBytes(opts2.format);
    }
    function verify(signature2, message, publicKey, opts2 = {}) {
      const { lowS, prehash, format } = validateSigOpts(opts2, defaultSigOpts);
      publicKey = abytes3(publicKey, void 0, "publicKey");
      message = validateMsgAndHash(message, prehash);
      if (!isBytes3(signature2)) {
        const end = signature2 instanceof Signature ? ", use sig.toBytes()" : "";
        throw new Error("verify expects Uint8Array signature" + end);
      }
      validateSigLength(signature2, format);
      try {
        const sig = Signature.fromBytes(signature2, format);
        const P = Point.fromBytes(publicKey);
        if (P.is0())
          return false;
        if (lowS && sig.hasHighS())
          return false;
        const { r, s } = sig;
        const h2 = bits2int_modN(message);
        const is2 = Fn.inv(s);
        const u1 = Fn.create(h2 * is2);
        const u2 = Fn.create(r * is2);
        const R = Point.BASE.mulAddUnsafe(u1, P, u2);
        if (R.is0())
          return false;
        const q = R.toAffine();
        const v = Fn.create(q.x);
        if (v !== r)
          return false;
        if (format === "recovered" && sig.recovery !== getRecoveryBit(q.x, q.y, r))
          return false;
        return true;
      } catch (e) {
        return false;
      }
    }
    function recoverPublicKey(signature2, message, opts2 = {}) {
      const { prehash } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      return Signature.fromBytes(signature2, "recovered").recoverPublicKey(message).toBytes();
    }
    return Object.freeze({
      keygen,
      getPublicKey,
      getSharedSecret,
      utils,
      lengths,
      Point,
      sign,
      verify,
      recoverPublicKey,
      Signature,
      hash: hash_
    });
  }
  var divNearest, _0n6, _1n5, _2n3, _3n3, _4n4;
  var init_weierstrass = __esm({
    "node_modules/@noble/curves/abstract/weierstrass.js"() {
      init_hmac();
      init_utils();
      init_utils2();
      init_curve();
      init_der();
      init_modular();
      divNearest = (num2, den) => (num2 + (num2 >= 0 ? den : -den) / _2n3) / den;
      _0n6 = /* @__PURE__ */ BigInt(0);
      _1n5 = /* @__PURE__ */ BigInt(1);
      _2n3 = /* @__PURE__ */ BigInt(2);
      _3n3 = /* @__PURE__ */ BigInt(3);
      _4n4 = /* @__PURE__ */ BigInt(4);
    }
  });

  // node_modules/@noble/curves/secp256k1.js
  var secp256k1_exports = {};
  __export(secp256k1_exports, {
    __TEST: () => __TEST,
    schnorr: () => schnorr,
    schnorr_FROST: () => schnorr_FROST,
    secp256k1: () => secp256k1,
    secp256k1_FROST: () => secp256k1_FROST,
    secp256k1_hasher: () => secp256k1_hasher
  });
  function sqrtMod(y) {
    const P = secp256k1_CURVE.p;
    const _3n4 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = y * y * y % P;
    const b3 = b2 * b2 * y % P;
    const b6 = pow2(b3, _3n4, P) * b3 % P;
    const b9 = pow2(b6, _3n4, P) * b3 % P;
    const b11 = pow2(b9, _2n4, P) * b2 % P;
    const b22 = pow2(b11, _11n, P) * b11 % P;
    const b44 = pow2(b22, _22n, P) * b22 % P;
    const b88 = pow2(b44, _44n, P) * b44 % P;
    const b176 = pow2(b88, _88n, P) * b88 % P;
    const b220 = pow2(b176, _44n, P) * b44 % P;
    const b223 = pow2(b220, _3n4, P) * b3 % P;
    const t1 = pow2(b223, _23n, P) * b22 % P;
    const t2 = pow2(t1, _6n, P) * b2 % P;
    const root = pow2(t2, _2n4, P);
    if (!Fpk1.eql(Fpk1.sqr(root), y))
      throw new Error("Cannot find square root");
    return root;
  }
  function taggedHash2(tag, ...messages) {
    let tagP = TAGGED_HASH_PREFIXES2[tag];
    if (tagP === void 0) {
      const tagH = sha2563(asciiToBytes(tag));
      tagP = concatBytes2(tagH, tagH);
      TAGGED_HASH_PREFIXES2[tag] = tagP;
    }
    return sha2563(concatBytes2(tagP, ...messages));
  }
  function schnorrGetExtPubKey(priv) {
    const { Fn, BASE } = Pointk1;
    const d_ = Fn.fromBytes(abytes3(priv, 32, "secretKey"));
    const p = BASE.multiply(d_);
    const affine = p.toAffine();
    const scalar = hasEven(affine.y) ? d_ : Fn.neg(d_);
    return { scalar, bytes: affineXToBytes(affine) };
  }
  function lift_x(x) {
    const Fp = Fpk1;
    if (!Fp.isValidNot0(x))
      throw new Error("invalid x: Fail if x \u2265 p");
    const xx = Fp.sqr(x);
    const c = Fp.add(Fp.mulN(xx, x), BigInt(7));
    let y = Fp.sqrt(c);
    if (!hasEven(y))
      y = Fp.neg(y);
    const p = Pointk1.fromAffine({ x, y });
    p.assertValidity();
    return p;
  }
  function challenge(...args) {
    return Pointk1.Fn.create(num(taggedHash2("BIP0340/challenge", ...args)));
  }
  function schnorrGetPublicKey(secretKey) {
    return schnorrGetExtPubKey(secretKey).bytes;
  }
  function schnorrSign(message, secretKey, auxRand = randomBytes(32)) {
    const { Fn, BASE } = Pointk1;
    const m = copyBytes(abytes3(message, void 0, "message"));
    const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey);
    const a = abytes3(auxRand, 32, "auxRand");
    const t = Fn.toBytes(d ^ num(taggedHash2("BIP0340/aux", a)));
    const rand = taggedHash2("BIP0340/nonce", t, px, m);
    const k_ = Fn.create(num(rand));
    if (k_ === _0n7)
      throw new Error("sign failed: k is zero");
    const p = BASE.multiply(k_);
    const affine = p.toAffine();
    const k = hasEven(affine.y) ? k_ : Fn.neg(k_);
    const rx = affineXToBytes(affine);
    const e = challenge(rx, px, m);
    const sig = new Uint8Array(64);
    sig.set(rx, 0);
    sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
    if (!schnorrVerify(sig, m, px))
      throw new Error("sign: Invalid signature produced");
    return sig;
  }
  function schnorrVerify(signature2, message, publicKey) {
    const { Fp, Fn, BASE } = Pointk1;
    const sig = abytes3(signature2, 64, "signature");
    const m = abytes3(message, void 0, "message");
    const pub = abytes3(publicKey, 32, "publicKey");
    try {
      const P = lift_x(num(pub));
      const rBytes = sig.subarray(0, 32);
      const r = num(rBytes);
      if (!Fp.isValidNot0(r))
        return false;
      const s = num(sig.subarray(32, 64));
      if (!Fn.isValidNot0(s))
        return false;
      const e = challenge(rBytes, pointToBytes(P), m);
      const R = BASE.mulAddUnsafe(s, P, Fn.neg(e));
      const { x, y } = R.toAffine();
      if (R.is0() || !hasEven(y) || !Fp.eql(x, r))
        return false;
      return true;
    } catch (error) {
      return false;
    }
  }
  function tweak(point, merkleRoot) {
    if (merkleRoot === void 0)
      return _0n7;
    const x = pointToBytes(point);
    const t = bytesToNumberBE(taggedHash2("TapTweak", x, merkleRoot));
    if (!Pointk1.Fn.isValid(t))
      throw new Error("invalid TapTweak hash");
    return t;
  }
  function frostPubToEvenY(pub) {
    const VK = Pointk1.fromBytes(pub.commitments[0]);
    if (hasEven(VK.y))
      return pub;
    return {
      signers: { min: pub.signers.min, max: pub.signers.max },
      commitments: pub.commitments.map((i) => Pointk1.fromBytes(i).negate().toBytes()),
      verifyingShares: Object.fromEntries(Object.entries(pub.verifyingShares).map(([k, v]) => [
        k,
        Pointk1.fromBytes(v).negate().toBytes()
      ]))
    };
  }
  function frostSecretToEvenY(s, pub) {
    const VK = Pointk1.fromBytes(pub.commitments[0]);
    if (hasEven(VK.y))
      return s;
    const Fn = Pointk1.Fn;
    return {
      ...s,
      signingShare: Fn.toBytes(Fn.neg(Fn.fromBytes(s.signingShare)))
    };
  }
  function frostNoncesToEvenY(groupCommitment, nonces) {
    if (hasEven(groupCommitment.y))
      return nonces;
    const Fn = Pointk1.Fn;
    return {
      binding: Fn.toBytes(Fn.neg(Fn.fromBytes(nonces.binding))),
      hiding: Fn.toBytes(Fn.neg(Fn.fromBytes(nonces.hiding)))
    };
  }
  function frostTweakSecret(s, pub, merkleRoot) {
    const Fn = Pointk1.Fn;
    const keyPackage = frostSecretToEvenY(s, pub);
    const evenPub = frostPubToEvenY(pub);
    const t = tweak(Pointk1.fromBytes(evenPub.commitments[0]), merkleRoot);
    const signingShare = Fn.toBytes(Fn.add(Fn.fromBytes(keyPackage.signingShare), t));
    return {
      identifier: keyPackage.identifier,
      signingShare
    };
  }
  function frostTweakPublic(pub, merkleRoot) {
    const PKPackage = frostPubToEvenY(pub);
    const t = tweak(Pointk1.fromBytes(PKPackage.commitments[0]), merkleRoot);
    if (t === _0n7)
      return PKPackage;
    const tp = Pointk1.BASE.multiply(t);
    const commitments = PKPackage.commitments.map((c, i) => (i === 0 ? Pointk1.fromBytes(c).add(tp) : Pointk1.fromBytes(c)).toBytes());
    const verifyingShares = {};
    for (const k in PKPackage.verifyingShares) {
      verifyingShares[k] = Pointk1.fromBytes(PKPackage.verifyingShares[k]).add(tp).toBytes();
    }
    return {
      signers: { min: PKPackage.signers.min, max: PKPackage.signers.max },
      commitments,
      verifyingShares
    };
  }
  var secp256k1_CURVE, secp256k1_ENDO, _0n7, _2n4, Fpk1, Pointk1, secp256k1, TAGGED_HASH_PREFIXES2, pointToBytes, affineXToBytes, hasEven, num, __TEST, schnorr, isoMap, mapSWU, getMapSWU, secp256k1_hasher, secp256k1_FROST, schnorr_FROST;
  var init_secp256k1 = __esm({
    "node_modules/@noble/curves/secp256k1.js"() {
      init_sha2();
      init_utils();
      init_curve();
      init_frost();
      init_hash_to_curve();
      init_modular();
      init_weierstrass();
      init_utils2();
      secp256k1_CURVE = {
        p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
        n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
        h: BigInt(1),
        a: BigInt(0),
        b: BigInt(7),
        Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
      };
      secp256k1_ENDO = {
        beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
        basises: [
          [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
          [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
        ]
      };
      _0n7 = /* @__PURE__ */ BigInt(0);
      _2n4 = /* @__PURE__ */ BigInt(2);
      Fpk1 = /* @__PURE__ */ Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
      Pointk1 = /* @__PURE__ */ weierstrass(secp256k1_CURVE, {
        Fp: Fpk1,
        endo: secp256k1_ENDO
      });
      secp256k1 = /* @__PURE__ */ ecdsa(Pointk1, sha2563);
      TAGGED_HASH_PREFIXES2 = /* @__PURE__ */ Object.create(null);
      pointToBytes = (point) => point.toBytes(true).slice(1);
      affineXToBytes = ({ x }) => Fpk1.toBytes(x);
      hasEven = (y) => !Fpk1.isOdd(y);
      num = bytesToNumberBE;
      __TEST = /* @__PURE__ */ Object.freeze({ lift_x, frostTweakPublic, frostTweakSecret });
      schnorr = /* @__PURE__ */ (() => {
        const size = 32;
        const seedLength = 48;
        const randomSecretKey = (seed) => {
          seed = seed === void 0 ? randomBytes(seedLength) : seed;
          return mapHashToField(abytes3(seed, seedLength, "seed"), secp256k1_CURVE.n);
        };
        return Object.freeze({
          keygen: createKeygen(randomSecretKey, schnorrGetPublicKey),
          getPublicKey: schnorrGetPublicKey,
          sign: schnorrSign,
          verify: schnorrVerify,
          Point: Pointk1,
          utils: Object.freeze({
            randomSecretKey,
            taggedHash: taggedHash2,
            lift_x,
            pointToBytes
          }),
          lengths: Object.freeze({
            secretKey: size,
            publicKey: size,
            publicKeyHasPrefix: false,
            signature: size * 2,
            seed: seedLength
          })
        });
      })();
      isoMap = /* @__PURE__ */ (() => isogenyMap(Fpk1, [
        // xNum
        [
          "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7",
          "0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581",
          "0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262",
          "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"
        ],
        // xDen
        [
          "0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b",
          "0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          // LAST 1
        ],
        // yNum
        [
          "0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c",
          "0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3",
          "0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931",
          "0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"
        ],
        // yDen
        [
          "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b",
          "0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573",
          "0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          // LAST 1
        ]
      ].map((i) => i.map((j) => BigInt(j)))))();
      getMapSWU = () => mapSWU || (mapSWU = mapToCurveSimpleSWU(Fpk1, {
        // Building the SWU sqrt-ratio helper eagerly adds noticeable `secp256k1.js` import cost, so
        // defer it to first use; after that the cached mapper is reused directly.
        A: BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),
        B: BigInt("1771"),
        Z: Fpk1.create(BigInt("-11"))
      }));
      secp256k1_hasher = /* @__PURE__ */ (() => createHasher3(Pointk1, (scalars) => {
        const { x, y } = getMapSWU()(Fpk1.create(scalars[0]));
        return isoMap(x, y);
      }, {
        DST: "secp256k1_XMD:SHA-256_SSWU_RO_",
        encodeDST: "secp256k1_XMD:SHA-256_SSWU_NU_",
        p: Fpk1.ORDER,
        m: 1,
        k: 128,
        expand: "xmd",
        hash: sha2563
      }))();
      secp256k1_FROST = /* @__PURE__ */ (() => createFROST({
        name: "FROST-secp256k1-SHA256-v1",
        Point: Pointk1,
        hashToScalar: secp256k1_hasher.hashToScalar,
        hash: sha2563
      }))();
      schnorr_FROST = /* @__PURE__ */ (() => createFROST({
        name: "FROST-secp256k1-SHA256-TR-v1",
        Point: Pointk1,
        hashToScalar: secp256k1_hasher.hashToScalar,
        hash: sha2563,
        // Taproot related hacks
        parsePublicKey(publicKey) {
          if (publicKey.length === 32)
            return lift_x(bytesToNumberBE(publicKey));
          if (publicKey.length === 33)
            return Pointk1.fromBytes(publicKey);
          throw new Error(`expected x-only or compressed public key, got length=${publicKey.length}`);
        },
        adjustScalar(n) {
          const PK = Pointk1.BASE.multiply(n);
          return hasEven(PK.y) ? n : Pointk1.Fn.neg(n);
        },
        adjustPoint: (p) => hasEven(p.y) ? p : p.negate(),
        challenge(R, PK, msg) {
          return challenge(pointToBytes(R), pointToBytes(PK), msg);
        },
        adjustNonces: frostNoncesToEvenY,
        adjustGroupCommitmentShare: (GC, GCShare) => !hasEven(GC.y) ? GCShare.negate() : GCShare,
        adjustPublic: frostPubToEvenY,
        adjustSecret: frostSecretToEvenY,
        adjustTx: {
          // Compat with official implementation
          encode: (tx) => tx.subarray(1),
          decode: (tx) => concatBytes2(Uint8Array.of(2), tx)
        },
        adjustDKG: (k) => {
          const merkleRoot = new Uint8Array(0);
          return {
            public: frostTweakPublic(k.public, merkleRoot),
            secret: frostTweakSecret(k.secret, k.public, merkleRoot)
          };
        }
      }))();
    }
  });

  // node_modules/@bitcoinerlab/secp256k1/dist/index.js
  var require_dist2 = __commonJS({
    "node_modules/@bitcoinerlab/secp256k1/dist/index.js"(exports) {
      "use strict";
      var secp256k1_js = (init_secp256k1(), __toCommonJS(secp256k1_exports));
      var utils = (init_utils2(), __toCommonJS(utils_exports));
      function _interopNamespaceDefault(e) {
        var n = /* @__PURE__ */ Object.create(null);
        if (e) {
          Object.keys(e).forEach(function(k) {
            if (k !== "default") {
              var d = Object.getOwnPropertyDescriptor(e, k);
              Object.defineProperty(n, k, d.get ? d : {
                enumerable: true,
                get: function() {
                  return e[k];
                }
              });
            }
          });
        }
        n.default = e;
        return Object.freeze(n);
      }
      var utils__namespace = /* @__PURE__ */ _interopNamespaceDefault(utils);
      var Point = secp256k1_js.secp256k1.Point;
      var Fn = Point.Fn;
      var THROW_BAD_PRIVATE = "Expected Private";
      var THROW_BAD_POINT = "Expected Point";
      var THROW_BAD_TWEAK = "Expected Tweak";
      var THROW_BAD_HASH = "Expected Hash";
      var THROW_BAD_SIGNATURE = "Expected Signature";
      var THROW_BAD_EXTRA_DATA = "Expected Extra Data (32 bytes)";
      var THROW_BAD_SCALAR = "Expected Scalar";
      var THROW_BAD_RECOVERY_ID = "Bad Recovery Id";
      var HASH_SIZE = 32;
      var TWEAK_SIZE = 32;
      var BN32_N = new Uint8Array([
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        254,
        186,
        174,
        220,
        230,
        175,
        72,
        160,
        59,
        191,
        210,
        94,
        140,
        208,
        54,
        65,
        65
      ]);
      var EXTRA_DATA_SIZE = 32;
      var BN32_ZERO = new Uint8Array(32);
      var BN32_P_MINUS_N = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        69,
        81,
        35,
        25,
        80,
        183,
        95,
        196,
        64,
        45,
        161,
        114,
        47,
        201,
        186,
        238
      ]);
      var _0n8 = BigInt(0);
      function isUint8Array(value2) {
        return value2 instanceof Uint8Array;
      }
      function cmpBN32(data1, data2) {
        for (let i = 0; i < 32; ++i) {
          if (data1[i] !== data2[i]) {
            return data1[i] < data2[i] ? -1 : 1;
          }
        }
        return 0;
      }
      function isZero(x) {
        return cmpBN32(x, BN32_ZERO) === 0;
      }
      function isTweak(tweak2) {
        if (!(tweak2 instanceof Uint8Array) || tweak2.length !== TWEAK_SIZE || cmpBN32(tweak2, BN32_N) >= 0) {
          return false;
        }
        return true;
      }
      function isSignature(signature2) {
        return signature2 instanceof Uint8Array && signature2.length === 64 && cmpBN32(signature2.subarray(0, 32), BN32_N) < 0 && cmpBN32(signature2.subarray(32, 64), BN32_N) < 0;
      }
      function isSigrLessThanPMinusN(signature2) {
        return isUint8Array(signature2) && signature2.length === 64 && cmpBN32(signature2.subarray(0, 32), BN32_P_MINUS_N) < 0;
      }
      function isSignatureNonzeroRS(signature2) {
        return !(isZero(signature2.subarray(0, 32)) || isZero(signature2.subarray(32, 64)));
      }
      function isHash(h2) {
        return h2 instanceof Uint8Array && h2.length === HASH_SIZE;
      }
      function isExtraData(e) {
        return e === void 0 || e instanceof Uint8Array && e.length === EXTRA_DATA_SIZE;
      }
      function normalizeScalar(scalar) {
        let num2;
        if (typeof scalar === "bigint") {
          num2 = scalar;
        } else if (typeof scalar === "number" && Number.isSafeInteger(scalar) && scalar >= 0) {
          num2 = BigInt(scalar);
        } else if (typeof scalar === "string") {
          if (scalar.length !== 64)
            throw new Error("Expected 32 bytes of private scalar");
          num2 = utils__namespace.hexToNumber(scalar);
        } else if (scalar instanceof Uint8Array) {
          if (scalar.length !== 32)
            throw new Error("Expected 32 bytes of private scalar");
          num2 = utils__namespace.bytesToNumberBE(scalar);
        } else {
          throw new TypeError("Expected valid private scalar");
        }
        if (num2 < 0) throw new Error("Expected private scalar >= 0");
        return num2;
      }
      function normalizePrivateKey(privateKey) {
        return Fn.fromBytes(privateKey);
      }
      function _privateAdd(privateKey, tweak2) {
        const p = normalizePrivateKey(privateKey);
        const t = normalizeScalar(tweak2);
        const add = Fn.add(p, t);
        return Fn.isValidNot0(add) ? Fn.toBytes(add) : null;
      }
      function _privateSub(privateKey, tweak2) {
        const p = normalizePrivateKey(privateKey);
        const t = normalizeScalar(tweak2);
        const sub = Fn.sub(p, t);
        return Fn.isValidNot0(sub) ? Fn.toBytes(sub) : null;
      }
      function _privateNegate(privateKey) {
        const p = normalizePrivateKey(privateKey);
        return Fn.toBytes(Fn.neg(p));
      }
      function _pointAddScalar(p, tweak2, isCompressed) {
        const P = fromHex4(p);
        const t = normalizeScalar(tweak2);
        const Q = t === _0n8 ? P : Point.BASE.multiply(t).add(P);
        if (Q.is0()) throw new Error("Tweaked point at infinity");
        return Q.toBytes(isCompressed);
      }
      function _pointMultiply(p, tweak2, isCompressed) {
        const P = fromHex4(p);
        const h2 = typeof tweak2 === "string" ? tweak2 : utils__namespace.bytesToHex(tweak2);
        const t = utils__namespace.hexToNumber(h2);
        return P.multiply(t).toBytes(isCompressed);
      }
      function assumeCompression(compressed, p) {
        if (compressed === void 0) {
          return p !== void 0 ? isPointCompressed(p) : true;
        }
        return !!compressed;
      }
      function throwToNull(fn) {
        try {
          return fn();
        } catch (e) {
          return null;
        }
      }
      function fromXOnly(bytes) {
        return secp256k1_js.schnorr.utils.lift_x(utils__namespace.bytesToNumberBE(bytes));
      }
      function fromHex4(bytes) {
        return bytes.length === 32 ? fromXOnly(bytes) : Point.fromBytes(bytes);
      }
      function _isPoint(p, xOnly) {
        if (p.length === 32 !== xOnly) return false;
        try {
          if (xOnly) return !!fromXOnly(p);
          else return !!Point.fromBytes(p);
        } catch (e) {
          return false;
        }
      }
      function isPoint2(p) {
        return _isPoint(p, false);
      }
      function isPointCompressed(p) {
        const PUBLIC_KEY_COMPRESSED_SIZE = 33;
        return _isPoint(p, false) && p.length === PUBLIC_KEY_COMPRESSED_SIZE;
      }
      function isPrivate(d) {
        return secp256k1_js.secp256k1.utils.isValidSecretKey(d);
      }
      function isXOnlyPoint(p) {
        return _isPoint(p, true);
      }
      function xOnlyPointAddTweak(p, tweak2) {
        if (!isXOnlyPoint(p)) {
          throw new Error(THROW_BAD_POINT);
        }
        if (!isTweak(tweak2)) {
          throw new Error(THROW_BAD_TWEAK);
        }
        return throwToNull(() => {
          const P = _pointAddScalar(p, tweak2, true);
          const parity = P[0] % 2 === 1 ? 1 : 0;
          return { parity, xOnlyPubkey: P.slice(1) };
        });
      }
      function xOnlyPointFromPoint(p) {
        if (!isPoint2(p)) {
          throw new Error(THROW_BAD_POINT);
        }
        return p.slice(1, 33);
      }
      function pointFromScalar(sk, compressed) {
        if (!isPrivate(sk)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        return throwToNull(
          () => secp256k1_js.secp256k1.getPublicKey(sk, assumeCompression(compressed))
        );
      }
      function xOnlyPointFromScalar(d) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        return xOnlyPointFromPoint(pointFromScalar(d));
      }
      function pointCompress(p, compressed) {
        if (!isPoint2(p)) {
          throw new Error(THROW_BAD_POINT);
        }
        return fromHex4(p).toBytes(assumeCompression(compressed, p));
      }
      function pointMultiply(a, tweak2, compressed) {
        if (!isPoint2(a)) {
          throw new Error(THROW_BAD_POINT);
        }
        if (!isTweak(tweak2)) {
          throw new Error(THROW_BAD_TWEAK);
        }
        return throwToNull(
          () => _pointMultiply(a, tweak2, assumeCompression(compressed, a))
        );
      }
      function pointAdd(a, b, compressed) {
        if (!isPoint2(a) || !isPoint2(b)) {
          throw new Error(THROW_BAD_POINT);
        }
        return throwToNull(() => {
          const A = fromHex4(a);
          const B = fromHex4(b);
          if (A.equals(B.negate())) {
            return null;
          } else {
            return A.add(B).toBytes(assumeCompression(compressed, a));
          }
        });
      }
      function pointAddScalar(p, tweak2, compressed) {
        if (!isPoint2(p)) {
          throw new Error(THROW_BAD_POINT);
        }
        if (!isTweak(tweak2)) {
          throw new Error(THROW_BAD_TWEAK);
        }
        return throwToNull(
          () => _pointAddScalar(p, tweak2, assumeCompression(compressed, p))
        );
      }
      function privateAdd(d, tweak2) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        if (!isTweak(tweak2)) {
          throw new Error(THROW_BAD_TWEAK);
        }
        return throwToNull(() => _privateAdd(d, tweak2));
      }
      function privateSub(d, tweak2) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        if (!isTweak(tweak2)) {
          throw new Error(THROW_BAD_TWEAK);
        }
        return throwToNull(() => _privateSub(d, tweak2));
      }
      function privateNegate(d) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        return _privateNegate(d);
      }
      function sign(h2, d, e) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_SCALAR);
        }
        if (!isExtraData(e)) {
          throw new Error(THROW_BAD_EXTRA_DATA);
        }
        return secp256k1_js.secp256k1.sign(h2, d, {
          prehash: false,
          lowS: true,
          format: "compact",
          extraEntropy: e
        });
      }
      function signRecoverable(h2, d, e) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_SCALAR);
        }
        if (!isExtraData(e)) {
          throw new Error(THROW_BAD_EXTRA_DATA);
        }
        const sig = secp256k1_js.secp256k1.sign(h2, d, {
          prehash: false,
          lowS: true,
          format: "recovered",
          extraEntropy: e
        });
        return {
          signature: sig.slice(1),
          recoveryId: sig[0]
        };
      }
      function signSchnorr(h2, d, e) {
        if (!isPrivate(d)) {
          throw new Error(THROW_BAD_PRIVATE);
        }
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_SCALAR);
        }
        if (!isExtraData(e)) {
          throw new Error(THROW_BAD_EXTRA_DATA);
        }
        return secp256k1_js.schnorr.sign(h2, d, e);
      }
      function recover(h2, signature2, recoveryId, compressed) {
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_HASH);
        }
        if (!isSignature(signature2) || !isSignatureNonzeroRS(signature2)) {
          throw new Error(THROW_BAD_SIGNATURE);
        }
        if (recoveryId & 2) {
          if (!isSigrLessThanPMinusN(signature2))
            throw new Error(THROW_BAD_RECOVERY_ID);
        }
        if (!isXOnlyPoint(signature2.subarray(0, 32))) {
          throw new Error(THROW_BAD_SIGNATURE);
        }
        const s = secp256k1_js.secp256k1.Signature.fromBytes(signature2, "compact").addRecoveryBit(
          recoveryId
        );
        const Q = s.recoverPublicKey(h2);
        if (!Q) throw new Error(THROW_BAD_SIGNATURE);
        return Q.toBytes(assumeCompression(compressed));
      }
      function verify(h2, Q, signature2, strict) {
        if (!isPoint2(Q)) {
          throw new Error(THROW_BAD_POINT);
        }
        if (!isSignature(signature2)) {
          throw new Error(THROW_BAD_SIGNATURE);
        }
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_SCALAR);
        }
        return secp256k1_js.secp256k1.verify(signature2, h2, Q, {
          prehash: false,
          lowS: strict,
          format: "compact"
        });
      }
      function verifySchnorr(h2, Q, signature2) {
        if (!isXOnlyPoint(Q)) {
          throw new Error(THROW_BAD_POINT);
        }
        if (!isSignature(signature2)) {
          throw new Error(THROW_BAD_SIGNATURE);
        }
        if (!isHash(h2)) {
          throw new Error(THROW_BAD_SCALAR);
        }
        return secp256k1_js.schnorr.verify(signature2, h2, Q);
      }
      exports.isPoint = isPoint2;
      exports.isPointCompressed = isPointCompressed;
      exports.isPrivate = isPrivate;
      exports.isXOnlyPoint = isXOnlyPoint;
      exports.pointAdd = pointAdd;
      exports.pointAddScalar = pointAddScalar;
      exports.pointCompress = pointCompress;
      exports.pointFromScalar = pointFromScalar;
      exports.pointMultiply = pointMultiply;
      exports.privateAdd = privateAdd;
      exports.privateNegate = privateNegate;
      exports.privateSub = privateSub;
      exports.recover = recover;
      exports.sign = sign;
      exports.signRecoverable = signRecoverable;
      exports.signSchnorr = signSchnorr;
      exports.verify = verify;
      exports.verifySchnorr = verifySchnorr;
      exports.xOnlyPointAddTweak = xOnlyPointAddTweak;
      exports.xOnlyPointFromPoint = xOnlyPointFromPoint;
      exports.xOnlyPointFromScalar = xOnlyPointFromScalar;
    }
  });

  // node_modules/bitcoinjs-lib/src/esm/networks.js
  var networks_exports = {};
  __export(networks_exports, {
    bitcoin: () => bitcoin,
    regtest: () => regtest,
    testnet: () => testnet
  });
  var bitcoin = {
    /**
     * The message prefix used for signing Bitcoin messages.
     */
    messagePrefix: "Bitcoin Signed Message:\n",
    /**
     * The Bech32 prefix used for Bitcoin addresses.
     */
    bech32: "bc",
    /**
     * The BIP32 key prefixes for Bitcoin.
     */
    bip32: {
      /**
       * The public key prefix for BIP32 extended public keys.
       */
      public: 76067358,
      /**
       * The private key prefix for BIP32 extended private keys.
       */
      private: 76066276
    },
    /**
     * The prefix for Bitcoin public key hashes.
     */
    pubKeyHash: 0,
    /**
     * The prefix for Bitcoin script hashes.
     */
    scriptHash: 5,
    /**
     * The prefix for Bitcoin Wallet Import Format (WIF) private keys.
     */
    wif: 128
  };
  var regtest = {
    messagePrefix: "Bitcoin Signed Message:\n",
    bech32: "bcrt",
    bip32: {
      public: 70617039,
      private: 70615956
    },
    pubKeyHash: 111,
    scriptHash: 196,
    wif: 239
  };
  var testnet = {
    messagePrefix: "Bitcoin Signed Message:\n",
    bech32: "tb",
    bip32: {
      public: 70617039,
      private: 70615956
    },
    pubKeyHash: 111,
    scriptHash: 196,
    wif: 239
  };

  // node_modules/bitcoinjs-lib/src/esm/bip66.js
  function check(buffer) {
    if (buffer.length < 8) return false;
    if (buffer.length > 72) return false;
    if (buffer[0] !== 48) return false;
    if (buffer[1] !== buffer.length - 2) return false;
    if (buffer[2] !== 2) return false;
    const lenR = buffer[3];
    if (lenR === 0) return false;
    if (5 + lenR >= buffer.length) return false;
    if (buffer[4 + lenR] !== 2) return false;
    const lenS = buffer[5 + lenR];
    if (lenS === 0) return false;
    if (6 + lenR + lenS !== buffer.length) return false;
    if (buffer[4] & 128) return false;
    if (lenR > 1 && buffer[4] === 0 && !(buffer[5] & 128)) return false;
    if (buffer[lenR + 6] & 128) return false;
    if (lenS > 1 && buffer[lenR + 6] === 0 && !(buffer[lenR + 7] & 128))
      return false;
    return true;
  }
  function decode(buffer) {
    if (buffer.length < 8) throw new Error("DER sequence length is too short");
    if (buffer.length > 72) throw new Error("DER sequence length is too long");
    if (buffer[0] !== 48) throw new Error("Expected DER sequence");
    if (buffer[1] !== buffer.length - 2)
      throw new Error("DER sequence length is invalid");
    if (buffer[2] !== 2) throw new Error("Expected DER integer");
    const lenR = buffer[3];
    if (lenR === 0) throw new Error("R length is zero");
    if (5 + lenR >= buffer.length) throw new Error("R length is too long");
    if (buffer[4 + lenR] !== 2) throw new Error("Expected DER integer (2)");
    const lenS = buffer[5 + lenR];
    if (lenS === 0) throw new Error("S length is zero");
    if (6 + lenR + lenS !== buffer.length) throw new Error("S length is invalid");
    if (buffer[4] & 128) throw new Error("R value is negative");
    if (lenR > 1 && buffer[4] === 0 && !(buffer[5] & 128))
      throw new Error("R value excessively padded");
    if (buffer[lenR + 6] & 128) throw new Error("S value is negative");
    if (lenS > 1 && buffer[lenR + 6] === 0 && !(buffer[lenR + 7] & 128))
      throw new Error("S value excessively padded");
    return {
      r: buffer.slice(4, 4 + lenR),
      s: buffer.slice(6 + lenR)
    };
  }
  function encode(r, s) {
    const lenR = r.length;
    const lenS = s.length;
    if (lenR === 0) throw new Error("R length is zero");
    if (lenS === 0) throw new Error("S length is zero");
    if (lenR > 33) throw new Error("R length is too long");
    if (lenS > 33) throw new Error("S length is too long");
    if (r[0] & 128) throw new Error("R value is negative");
    if (s[0] & 128) throw new Error("S value is negative");
    if (lenR > 1 && r[0] === 0 && !(r[1] & 128))
      throw new Error("R value excessively padded");
    if (lenS > 1 && s[0] === 0 && !(s[1] & 128))
      throw new Error("S value excessively padded");
    const signature2 = new Uint8Array(6 + lenR + lenS);
    signature2[0] = 48;
    signature2[1] = signature2.length - 2;
    signature2[2] = 2;
    signature2[3] = r.length;
    signature2.set(r, 4);
    signature2[4 + lenR] = 2;
    signature2[5 + lenR] = s.length;
    signature2.set(s, 6 + lenR);
    return signature2;
  }

  // node_modules/bitcoinjs-lib/src/esm/ops.js
  var OPS;
  (function(OPS9) {
    OPS9[OPS9["OP_FALSE"] = 0] = "OP_FALSE";
    OPS9[OPS9["OP_0"] = 0] = "OP_0";
    OPS9[OPS9["OP_PUSHDATA1"] = 76] = "OP_PUSHDATA1";
    OPS9[OPS9["OP_PUSHDATA2"] = 77] = "OP_PUSHDATA2";
    OPS9[OPS9["OP_PUSHDATA4"] = 78] = "OP_PUSHDATA4";
    OPS9[OPS9["OP_1NEGATE"] = 79] = "OP_1NEGATE";
    OPS9[OPS9["OP_RESERVED"] = 80] = "OP_RESERVED";
    OPS9[OPS9["OP_TRUE"] = 81] = "OP_TRUE";
    OPS9[OPS9["OP_1"] = 81] = "OP_1";
    OPS9[OPS9["OP_2"] = 82] = "OP_2";
    OPS9[OPS9["OP_3"] = 83] = "OP_3";
    OPS9[OPS9["OP_4"] = 84] = "OP_4";
    OPS9[OPS9["OP_5"] = 85] = "OP_5";
    OPS9[OPS9["OP_6"] = 86] = "OP_6";
    OPS9[OPS9["OP_7"] = 87] = "OP_7";
    OPS9[OPS9["OP_8"] = 88] = "OP_8";
    OPS9[OPS9["OP_9"] = 89] = "OP_9";
    OPS9[OPS9["OP_10"] = 90] = "OP_10";
    OPS9[OPS9["OP_11"] = 91] = "OP_11";
    OPS9[OPS9["OP_12"] = 92] = "OP_12";
    OPS9[OPS9["OP_13"] = 93] = "OP_13";
    OPS9[OPS9["OP_14"] = 94] = "OP_14";
    OPS9[OPS9["OP_15"] = 95] = "OP_15";
    OPS9[OPS9["OP_16"] = 96] = "OP_16";
    OPS9[OPS9["OP_NOP"] = 97] = "OP_NOP";
    OPS9[OPS9["OP_VER"] = 98] = "OP_VER";
    OPS9[OPS9["OP_IF"] = 99] = "OP_IF";
    OPS9[OPS9["OP_NOTIF"] = 100] = "OP_NOTIF";
    OPS9[OPS9["OP_VERIF"] = 101] = "OP_VERIF";
    OPS9[OPS9["OP_VERNOTIF"] = 102] = "OP_VERNOTIF";
    OPS9[OPS9["OP_ELSE"] = 103] = "OP_ELSE";
    OPS9[OPS9["OP_ENDIF"] = 104] = "OP_ENDIF";
    OPS9[OPS9["OP_VERIFY"] = 105] = "OP_VERIFY";
    OPS9[OPS9["OP_RETURN"] = 106] = "OP_RETURN";
    OPS9[OPS9["OP_TOALTSTACK"] = 107] = "OP_TOALTSTACK";
    OPS9[OPS9["OP_FROMALTSTACK"] = 108] = "OP_FROMALTSTACK";
    OPS9[OPS9["OP_2DROP"] = 109] = "OP_2DROP";
    OPS9[OPS9["OP_2DUP"] = 110] = "OP_2DUP";
    OPS9[OPS9["OP_3DUP"] = 111] = "OP_3DUP";
    OPS9[OPS9["OP_2OVER"] = 112] = "OP_2OVER";
    OPS9[OPS9["OP_2ROT"] = 113] = "OP_2ROT";
    OPS9[OPS9["OP_2SWAP"] = 114] = "OP_2SWAP";
    OPS9[OPS9["OP_IFDUP"] = 115] = "OP_IFDUP";
    OPS9[OPS9["OP_DEPTH"] = 116] = "OP_DEPTH";
    OPS9[OPS9["OP_DROP"] = 117] = "OP_DROP";
    OPS9[OPS9["OP_DUP"] = 118] = "OP_DUP";
    OPS9[OPS9["OP_NIP"] = 119] = "OP_NIP";
    OPS9[OPS9["OP_OVER"] = 120] = "OP_OVER";
    OPS9[OPS9["OP_PICK"] = 121] = "OP_PICK";
    OPS9[OPS9["OP_ROLL"] = 122] = "OP_ROLL";
    OPS9[OPS9["OP_ROT"] = 123] = "OP_ROT";
    OPS9[OPS9["OP_SWAP"] = 124] = "OP_SWAP";
    OPS9[OPS9["OP_TUCK"] = 125] = "OP_TUCK";
    OPS9[OPS9["OP_CAT"] = 126] = "OP_CAT";
    OPS9[OPS9["OP_SUBSTR"] = 127] = "OP_SUBSTR";
    OPS9[OPS9["OP_LEFT"] = 128] = "OP_LEFT";
    OPS9[OPS9["OP_RIGHT"] = 129] = "OP_RIGHT";
    OPS9[OPS9["OP_SIZE"] = 130] = "OP_SIZE";
    OPS9[OPS9["OP_INVERT"] = 131] = "OP_INVERT";
    OPS9[OPS9["OP_AND"] = 132] = "OP_AND";
    OPS9[OPS9["OP_OR"] = 133] = "OP_OR";
    OPS9[OPS9["OP_XOR"] = 134] = "OP_XOR";
    OPS9[OPS9["OP_EQUAL"] = 135] = "OP_EQUAL";
    OPS9[OPS9["OP_EQUALVERIFY"] = 136] = "OP_EQUALVERIFY";
    OPS9[OPS9["OP_RESERVED1"] = 137] = "OP_RESERVED1";
    OPS9[OPS9["OP_RESERVED2"] = 138] = "OP_RESERVED2";
    OPS9[OPS9["OP_1ADD"] = 139] = "OP_1ADD";
    OPS9[OPS9["OP_1SUB"] = 140] = "OP_1SUB";
    OPS9[OPS9["OP_2MUL"] = 141] = "OP_2MUL";
    OPS9[OPS9["OP_2DIV"] = 142] = "OP_2DIV";
    OPS9[OPS9["OP_NEGATE"] = 143] = "OP_NEGATE";
    OPS9[OPS9["OP_ABS"] = 144] = "OP_ABS";
    OPS9[OPS9["OP_NOT"] = 145] = "OP_NOT";
    OPS9[OPS9["OP_0NOTEQUAL"] = 146] = "OP_0NOTEQUAL";
    OPS9[OPS9["OP_ADD"] = 147] = "OP_ADD";
    OPS9[OPS9["OP_SUB"] = 148] = "OP_SUB";
    OPS9[OPS9["OP_MUL"] = 149] = "OP_MUL";
    OPS9[OPS9["OP_DIV"] = 150] = "OP_DIV";
    OPS9[OPS9["OP_MOD"] = 151] = "OP_MOD";
    OPS9[OPS9["OP_LSHIFT"] = 152] = "OP_LSHIFT";
    OPS9[OPS9["OP_RSHIFT"] = 153] = "OP_RSHIFT";
    OPS9[OPS9["OP_BOOLAND"] = 154] = "OP_BOOLAND";
    OPS9[OPS9["OP_BOOLOR"] = 155] = "OP_BOOLOR";
    OPS9[OPS9["OP_NUMEQUAL"] = 156] = "OP_NUMEQUAL";
    OPS9[OPS9["OP_NUMEQUALVERIFY"] = 157] = "OP_NUMEQUALVERIFY";
    OPS9[OPS9["OP_NUMNOTEQUAL"] = 158] = "OP_NUMNOTEQUAL";
    OPS9[OPS9["OP_LESSTHAN"] = 159] = "OP_LESSTHAN";
    OPS9[OPS9["OP_GREATERTHAN"] = 160] = "OP_GREATERTHAN";
    OPS9[OPS9["OP_LESSTHANOREQUAL"] = 161] = "OP_LESSTHANOREQUAL";
    OPS9[OPS9["OP_GREATERTHANOREQUAL"] = 162] = "OP_GREATERTHANOREQUAL";
    OPS9[OPS9["OP_MIN"] = 163] = "OP_MIN";
    OPS9[OPS9["OP_MAX"] = 164] = "OP_MAX";
    OPS9[OPS9["OP_WITHIN"] = 165] = "OP_WITHIN";
    OPS9[OPS9["OP_RIPEMD160"] = 166] = "OP_RIPEMD160";
    OPS9[OPS9["OP_SHA1"] = 167] = "OP_SHA1";
    OPS9[OPS9["OP_SHA256"] = 168] = "OP_SHA256";
    OPS9[OPS9["OP_HASH160"] = 169] = "OP_HASH160";
    OPS9[OPS9["OP_HASH256"] = 170] = "OP_HASH256";
    OPS9[OPS9["OP_CODESEPARATOR"] = 171] = "OP_CODESEPARATOR";
    OPS9[OPS9["OP_CHECKSIG"] = 172] = "OP_CHECKSIG";
    OPS9[OPS9["OP_CHECKSIGVERIFY"] = 173] = "OP_CHECKSIGVERIFY";
    OPS9[OPS9["OP_CHECKMULTISIG"] = 174] = "OP_CHECKMULTISIG";
    OPS9[OPS9["OP_CHECKMULTISIGVERIFY"] = 175] = "OP_CHECKMULTISIGVERIFY";
    OPS9[OPS9["OP_NOP1"] = 176] = "OP_NOP1";
    OPS9[OPS9["OP_CHECKLOCKTIMEVERIFY"] = 177] = "OP_CHECKLOCKTIMEVERIFY";
    OPS9[OPS9["OP_NOP2"] = 177] = "OP_NOP2";
    OPS9[OPS9["OP_CHECKSEQUENCEVERIFY"] = 178] = "OP_CHECKSEQUENCEVERIFY";
    OPS9[OPS9["OP_NOP3"] = 178] = "OP_NOP3";
    OPS9[OPS9["OP_NOP4"] = 179] = "OP_NOP4";
    OPS9[OPS9["OP_NOP5"] = 180] = "OP_NOP5";
    OPS9[OPS9["OP_NOP6"] = 181] = "OP_NOP6";
    OPS9[OPS9["OP_NOP7"] = 182] = "OP_NOP7";
    OPS9[OPS9["OP_NOP8"] = 183] = "OP_NOP8";
    OPS9[OPS9["OP_NOP9"] = 184] = "OP_NOP9";
    OPS9[OPS9["OP_NOP10"] = 185] = "OP_NOP10";
    OPS9[OPS9["OP_CHECKSIGADD"] = 186] = "OP_CHECKSIGADD";
    OPS9[OPS9["OP_PUBKEYHASH"] = 253] = "OP_PUBKEYHASH";
    OPS9[OPS9["OP_PUBKEY"] = 254] = "OP_PUBKEY";
    OPS9[OPS9["OP_INVALIDOPCODE"] = 255] = "OP_INVALIDOPCODE";
  })(OPS || (OPS = {}));

  // node_modules/bitcoinjs-lib/node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS = "0123456789abcdefABCDEF";
  var HEX_CODES = HEX_STRINGS.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER = new TextEncoder();
  var DECODER = new TextDecoder();
  function concat(arrays) {
    const totalLength = arrays.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array2 of arrays) {
      result.set(array2, offset);
      offset += array2.length;
    }
    return result;
  }
  function toHex(bytes) {
    const b = bytes || new Uint8Array();
    return b.length > 512 ? _toHexLengthPerf(b) : _toHexIterPerf(b);
  }
  function _toHexIterPerf(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; ++i) {
      s += HEX_STRINGS[HEX_CODEPOINTS[HEX_CODES[bytes[i] >> 4]]];
      s += HEX_STRINGS[HEX_CODEPOINTS[HEX_CODES[bytes[i] & 15]]];
    }
    return s;
  }
  function _toHexLengthPerf(bytes) {
    const hexBytes = new Uint8Array(bytes.length * 2);
    for (let i = 0; i < bytes.length; ++i) {
      hexBytes[i * 2] = HEX_CODES[bytes[i] >> 4];
      hexBytes[i * 2 + 1] = HEX_CODES[bytes[i] & 15];
    }
    return DECODER.decode(hexBytes);
  }
  function fromHex(hexString) {
    const hexBytes = ENCODER.encode(hexString || "");
    const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
    let i;
    for (i = 0; i < resultBytes.length; i++) {
      const a = HEX_CODEPOINTS[hexBytes[i * 2]];
      const b = HEX_CODEPOINTS[hexBytes[i * 2 + 1]];
      if (a === void 0 || b === void 0) {
        break;
      }
      resultBytes[i] = a << 4 | b;
    }
    return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
  }
  function fromBase64(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function compare(v1, v2) {
    const minLength = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLength; ++i) {
      if (v1[i] !== v2[i]) {
        return v1[i] < v2[i] ? -1 : 1;
      }
    }
    return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
  }
  function writeUInt8(buffer, offset, value2) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 255) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${255}. Received ${value2}`);
    }
    buffer[offset] = value2;
    return offset + 1;
  }
  function writeUInt16(buffer, offset, value2, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 65535) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${65535}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
    } else {
      buffer[offset] = value2 >> 8 & 255;
      buffer[offset + 1] = value2 & 255;
    }
    return offset + 2;
  }
  function writeUInt32(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function writeUInt64(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 0xffffffffffffffffn) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readUInt8(buffer, offset) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    return buffer[offset];
  }
  function readUInt16(buffer, offset, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset + 1];
      num2 = (num2 << 8) + buffer[offset];
      return num2;
    } else {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset];
      num2 = (num2 << 8) + buffer[offset + 1];
      return num2;
    }
  }
  function readUInt32(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      return num2;
    } else {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      return num2;
    }
  }
  function writeInt32(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 2147483647 || value2 < -2147483648) {
      throw new Error(`The value of "value" is out of range. It must be >= ${-2147483648} and <= ${2147483647}. Received ${value2}`);
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function writeInt64(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 0x7fffffffffffffffn || value2 < -0x8000000000000000n) {
      throw new Error(`The value of "value" is out of range. It must be >= ${-0x8000000000000000n} and <= ${0x7fffffffffffffffn}. Received ${value2}`);
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readInt32(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      const val = buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16) + (buffer[offset + 3] << 24 >>> 0);
      return buffer[offset + 3] <= 127 ? val : val - 4294967296;
    } else {
      const val = (buffer[offset] << 24 >>> 0) + (buffer[offset + 1] << 16) + (buffer[offset + 2] << 8) + buffer[offset + 3];
      return buffer[offset] <= 127 ? val : val - 4294967296;
    }
  }
  function readInt64(buffer, offset, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    let num2 = 0n;
    if (littleEndian === "LE") {
      num2 = (num2 << 8n) + BigInt(buffer[offset + 7]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 6]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 5]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 4]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 3]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 2]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 1]);
      num2 = (num2 << 8n) + BigInt(buffer[offset]);
      return buffer[offset + 7] <= 127 ? num2 : num2 - 0x10000000000000000n;
    } else {
      let num3 = 0n;
      num3 = (num3 << 8n) + BigInt(buffer[offset]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 1]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 2]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 3]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 4]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 5]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 6]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 7]);
      return buffer[offset] <= 127 ? num3 : num3 - 0x10000000000000000n;
    }
  }

  // node_modules/bitcoinjs-lib/src/esm/push_data.js
  function encodingLength(i) {
    return i < OPS.OP_PUSHDATA1 ? 1 : i <= 255 ? 2 : i <= 65535 ? 3 : 5;
  }
  function encode2(buffer, num2, offset) {
    const size = encodingLength(num2);
    if (size === 1) {
      writeUInt8(buffer, offset, num2);
    } else if (size === 2) {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA1);
      writeUInt8(buffer, offset + 1, num2);
    } else if (size === 3) {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA2);
      writeUInt16(buffer, offset + 1, num2, "LE");
    } else {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA4);
      writeUInt32(buffer, offset + 1, num2, "LE");
    }
    return size;
  }
  function decode2(buffer, offset) {
    const opcode = readUInt8(buffer, offset);
    let num2;
    let size;
    if (opcode < OPS.OP_PUSHDATA1) {
      num2 = opcode;
      size = 1;
    } else if (opcode === OPS.OP_PUSHDATA1) {
      if (offset + 2 > buffer.length) return null;
      num2 = readUInt8(buffer, offset + 1);
      size = 2;
    } else if (opcode === OPS.OP_PUSHDATA2) {
      if (offset + 3 > buffer.length) return null;
      num2 = readUInt16(buffer, offset + 1, "LE");
      size = 3;
    } else {
      if (offset + 5 > buffer.length) return null;
      if (opcode !== OPS.OP_PUSHDATA4) throw new Error("Unexpected opcode");
      num2 = readUInt32(buffer, offset + 1, "LE");
      size = 5;
    }
    return {
      opcode,
      number: num2,
      size
    };
  }

  // node_modules/bitcoinjs-lib/src/esm/script_number.js
  function decode3(buffer, maxLength, minimal) {
    maxLength = maxLength || 4;
    minimal = minimal === void 0 ? true : minimal;
    const length2 = buffer.length;
    if (length2 === 0) return 0;
    if (length2 > maxLength) throw new TypeError("Script number overflow");
    if (minimal) {
      if ((buffer[length2 - 1] & 127) === 0) {
        if (length2 <= 1 || (buffer[length2 - 2] & 128) === 0)
          throw new Error("Non-minimally encoded script number");
      }
    }
    if (length2 === 5) {
      const a = readUInt32(buffer, 0, "LE");
      const b = readUInt8(buffer, 4);
      if (b & 128) return -((b & ~128) * 4294967296 + a);
      return b * 4294967296 + a;
    }
    let result = 0;
    for (let i = 0; i < length2; ++i) {
      result |= buffer[i] << 8 * i;
    }
    if (buffer[length2 - 1] & 128)
      return -(result & ~(128 << 8 * (length2 - 1)));
    return result;
  }
  function scriptNumSize(i) {
    return i > 2147483647 ? 5 : i > 8388607 ? 4 : i > 32767 ? 3 : i > 127 ? 2 : i > 0 ? 1 : 0;
  }
  function encode3(_number) {
    let value2 = Math.abs(_number);
    const size = scriptNumSize(value2);
    const buffer = new Uint8Array(size);
    const negative = _number < 0;
    for (let i = 0; i < size; ++i) {
      writeUInt8(buffer, i, value2 & 255);
      value2 >>= 8;
    }
    if (buffer[size - 1] & 128) {
      writeUInt8(buffer, size - 1, negative ? 128 : 0);
    } else if (negative) {
      buffer[size - 1] |= 128;
    }
    return buffer;
  }

  // node_modules/bitcoinjs-lib/src/esm/script_signature.js
  var script_signature_exports = {};
  __export(script_signature_exports, {
    decode: () => decode4,
    encode: () => encode4
  });

  // node_modules/valibot/dist/index.mjs
  var store$4;
  var DEFAULT_CONFIG = {
    lang: void 0,
    message: void 0,
    abortEarly: void 0,
    abortPipeEarly: void 0
  };
  // @__NO_SIDE_EFFECTS__
  function getGlobalConfig(config$1) {
    if (!config$1 && !store$4) return DEFAULT_CONFIG;
    return {
      lang: config$1?.lang ?? store$4?.lang,
      message: config$1?.message,
      abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
      abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
    };
  }
  var store$3;
  // @__NO_SIDE_EFFECTS__
  function getGlobalMessage(lang) {
    return store$3?.get(lang);
  }
  var store$2;
  // @__NO_SIDE_EFFECTS__
  function getSchemaMessage(lang) {
    return store$2?.get(lang);
  }
  var store$1;
  // @__NO_SIDE_EFFECTS__
  function getSpecificMessage(reference, lang) {
    return store$1?.get(reference)?.get(lang);
  }
  // @__NO_SIDE_EFFECTS__
  function _stringify(input) {
    const type = typeof input;
    if (type === "string") return `"${input}"`;
    if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
    if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
    return type;
  }
  function _addIssue(context, label, dataset, config$1, other) {
    const input = other && "input" in other ? other.input : dataset.value;
    const expected14 = other?.expected ?? context.expects ?? null;
    const received = other?.received ?? /* @__PURE__ */ _stringify(input);
    const issue = {
      kind: context.kind,
      type: context.type,
      input,
      expected: expected14,
      received,
      message: `Invalid ${label}: ${expected14 ? `Expected ${expected14} but r` : "R"}eceived ${received}`,
      requirement: context.requirement,
      path: other?.path,
      issues: other?.issues,
      lang: config$1.lang,
      abortEarly: config$1.abortEarly,
      abortPipeEarly: config$1.abortPipeEarly
    };
    const isSchema = context.kind === "schema";
    const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
    if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
    if (isSchema) dataset.typed = false;
    if (dataset.issues) dataset.issues.push(issue);
    else dataset.issues = [issue];
  }
  // @__NO_SIDE_EFFECTS__
  function _joinExpects(values$1, separator) {
    const list = [...new Set(values$1)];
    if (list.length > 1) return `(${list.join(` ${separator} `)})`;
    return list[0] ?? "never";
  }
  function _standardSchema(schema) {
    schema["~standard"] = {
      version: 1,
      vendor: "valibot",
      validate: (value$1) => schema["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig())
    };
    return schema;
  }
  var ValiError = class extends Error {
    /**
    * Creates a Valibot error with useful information.
    *
    * @param issues The error issues.
    */
    constructor(issues) {
      super(issues[0].message);
      this.name = "ValiError";
      this.issues = issues;
    }
  };
  // @__NO_SIDE_EFFECTS__
  function everyItem(requirement, message$1) {
    return {
      kind: "validation",
      type: "every_item",
      reference: everyItem,
      async: false,
      expects: null,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !dataset.value.every(this.requirement)) _addIssue(this, "item", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function integer(message$1) {
    return {
      kind: "validation",
      type: "integer",
      reference: integer,
      async: false,
      expects: null,
      requirement: Number.isInteger,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "integer", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function length(requirement, message$1) {
    return {
      kind: "validation",
      type: "length",
      reference: length,
      async: false,
      expects: `${requirement}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && dataset.value.length !== this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function maxValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "max_value",
      reference: maxValue,
      async: false,
      expects: `<=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value <= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function minValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "min_value",
      reference: minValue,
      async: false,
      expects: `>=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value >= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function regex(requirement, message$1) {
    return {
      kind: "validation",
      type: "regex",
      reference: regex,
      async: false,
      expects: `${requirement}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement.test(dataset.value)) _addIssue(this, "format", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function transform(operation) {
    return {
      kind: "transformation",
      type: "transform",
      reference: transform,
      async: false,
      operation,
      "~run"(dataset) {
        dataset.value = this.operation(dataset.value);
        return dataset;
      }
    };
  }
  var ABORT_EARLY_CONFIG = { abortEarly: true };
  // @__NO_SIDE_EFFECTS__
  function getFallback(schema, dataset, config$1) {
    return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
  }
  // @__NO_SIDE_EFFECTS__
  function getDefault(schema, dataset, config$1) {
    return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
  }
  // @__NO_SIDE_EFFECTS__
  function is(schema, input) {
    return !schema["~run"]({ value: input }, ABORT_EARLY_CONFIG).issues;
  }
  // @__NO_SIDE_EFFECTS__
  function any() {
    return _standardSchema({
      kind: "schema",
      type: "any",
      reference: any,
      expects: "any",
      async: false,
      "~run"(dataset) {
        dataset.typed = true;
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function array(item, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "array",
      reference: array,
      expects: "Array",
      async: false,
      item,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < input.length; key++) {
            const value$1 = input[key];
            const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) issue.path.unshift(pathItem);
                else issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) dataset.issues = itemDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) dataset.typed = false;
            dataset.value.push(itemDataset.value);
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function bigint(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "bigint",
      reference: bigint,
      expects: "bigint",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "bigint") dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function boolean(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "boolean",
      reference: boolean,
      expects: "boolean",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "boolean") dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function custom(check$1, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "custom",
      reference: custom,
      expects: "unknown",
      async: false,
      check: check$1,
      message: message$1,
      "~run"(dataset, config$1) {
        if (this.check(dataset.value)) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function instance(class_, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "instance",
      reference: instance,
      expects: class_.name,
      async: false,
      class: class_,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.value instanceof this.class) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function nullable(wrapped, default_) {
    return _standardSchema({
      kind: "schema",
      type: "nullable",
      reference: nullable,
      expects: `(${wrapped.expects} | null)`,
      async: false,
      wrapped,
      default: default_,
      "~run"(dataset, config$1) {
        if (dataset.value === null) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === null) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function nullish(wrapped, default_) {
    return _standardSchema({
      kind: "schema",
      type: "nullish",
      reference: nullish,
      expects: `(${wrapped.expects} | null | undefined)`,
      async: false,
      wrapped,
      default: default_,
      "~run"(dataset, config$1) {
        if (dataset.value === null || dataset.value === void 0) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === null || dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function number(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "number",
      reference: number,
      expects: "number",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function object(entries$1, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "object",
      reference: object,
      expects: "Object",
      async: false,
      entries: entries$1,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const key in this.entries) {
            const valueSchema = this.entries[key];
            if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
              const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
              const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key,
                  value: value$1
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path) issue.path.unshift(pathItem);
                  else issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues) dataset.issues = valueDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!valueDataset.typed) dataset.typed = false;
              dataset.value[key] = valueDataset.value;
            } else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
            else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
              _addIssue(this, "key", dataset, config$1, {
                input: void 0,
                expected: `"${key}"`,
                path: [{
                  type: "object",
                  origin: "key",
                  input,
                  key,
                  value: input[key]
                }]
              });
              if (config$1.abortEarly) break;
            }
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function optional(wrapped, default_) {
    return _standardSchema({
      kind: "schema",
      type: "optional",
      reference: optional,
      expects: `(${wrapped.expects} | undefined)`,
      async: false,
      wrapped,
      default: default_,
      "~run"(dataset, config$1) {
        if (dataset.value === void 0) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function string(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "string",
      reference: string,
      expects: "string",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "string") dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function tuple(items, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "tuple",
      reference: tuple,
      expects: "Array",
      async: false,
      items,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < this.items.length; key++) {
            const value$1 = input[key];
            const itemDataset = this.items[key]["~run"]({ value: value$1 }, config$1);
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) issue.path.unshift(pathItem);
                else issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) dataset.issues = itemDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) dataset.typed = false;
            dataset.value.push(itemDataset.value);
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _subIssues(datasets) {
    let issues;
    if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
    else issues = dataset.issues;
    return issues;
  }
  // @__NO_SIDE_EFFECTS__
  function union(options, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "union",
      reference: union,
      expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
      async: false,
      options,
      message: message$1,
      "~run"(dataset, config$1) {
        let validDataset;
        let typedDatasets;
        let untypedDatasets;
        for (const schema of this.options) {
          const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
          if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
          else typedDatasets = [optionDataset];
          else {
            validDataset = optionDataset;
            break;
          }
          else if (untypedDatasets) untypedDatasets.push(optionDataset);
          else untypedDatasets = [optionDataset];
        }
        if (validDataset) return validDataset;
        if (typedDatasets) {
          if (typedDatasets.length === 1) return typedDatasets[0];
          _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
          dataset.typed = true;
        } else if (untypedDatasets?.length === 1) return untypedDatasets[0];
        else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
        return dataset;
      }
    });
  }
  function parse(schema, input, config$1) {
    const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
    if (dataset.issues) throw new ValiError(dataset.issues);
    return dataset.value;
  }
  // @__NO_SIDE_EFFECTS__
  function partial(schema, keys) {
    const entries$1 = {};
    for (const key in schema.entries) entries$1[key] = !keys || keys.includes(key) ? /* @__PURE__ */ optional(schema.entries[key]) : schema.entries[key];
    return _standardSchema({
      ...schema,
      entries: entries$1
    });
  }
  // @__NO_SIDE_EFFECTS__
  function pipe(...pipe$1) {
    return _standardSchema({
      ...pipe$1[0],
      pipe: pipe$1,
      "~run"(dataset, config$1) {
        for (const item of pipe$1) if (item.kind !== "metadata") {
          if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
        }
        return dataset;
      }
    });
  }

  // node_modules/bitcoinjs-lib/src/esm/types.js
  var ZERO32 = new Uint8Array(32);
  var EC_P = fromHex(
    "fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"
  );
  var NBufferSchemaFactory = (size) => pipe(instance(Uint8Array), length(size));
  function stacksEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => {
      return compare(x, b[i]) === 0;
    });
  }
  function isPoint(p) {
    if (!(p instanceof Uint8Array)) return false;
    if (p.length < 33) return false;
    const t = p[0];
    const x = p.slice(1, 33);
    if (compare(ZERO32, x) === 0) return false;
    if (compare(x, EC_P) >= 0) return false;
    if ((t === 2 || t === 3) && p.length === 33) {
      return true;
    }
    const y = p.slice(33);
    if (compare(ZERO32, y) === 0) return false;
    if (compare(y, EC_P) >= 0) return false;
    if (t === 4 && p.length === 65) return true;
    return false;
  }
  var TAPLEAF_VERSION_MASK = 254;
  function isTapleaf(o) {
    if (!o || !("output" in o)) return false;
    if (!(o.output instanceof Uint8Array)) return false;
    if (o.version !== void 0)
      return (o.version & TAPLEAF_VERSION_MASK) === o.version;
    return true;
  }
  function isTaptree(scriptTree) {
    if (!Array.isArray(scriptTree)) return isTapleaf(scriptTree);
    if (scriptTree.length !== 2) return false;
    return scriptTree.every((t) => isTaptree(t));
  }
  var Buffer256bitSchema = NBufferSchemaFactory(32);
  var Hash160bitSchema = NBufferSchemaFactory(20);
  var Hash256bitSchema = NBufferSchemaFactory(32);
  var BufferSchema = instance(Uint8Array);
  var HexSchema = pipe(string(), regex(/^([0-9a-f]{2})+$/i));
  var UInt8Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(255)
  );
  var UInt32Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(4294967295)
  );
  var SatoshiSchema = pipe(
    bigint(),
    minValue(0n),
    maxValue(0x7fffffffffffffffn)
  );
  var NullablePartial = (a) => object(
    Object.entries(a).reduce(
      (acc, next) => ({ ...acc, [next[0]]: nullish(next[1]) }),
      {}
    )
  );

  // node_modules/bitcoinjs-lib/src/esm/script_signature.js
  var ZERO = new Uint8Array(1);
  function toDER(x) {
    let i = 0;
    while (x[i] === 0) ++i;
    if (i === x.length) return ZERO;
    x = x.slice(i);
    if (x[0] & 128) return concat([ZERO, x]);
    return x;
  }
  function fromDER(x) {
    if (x[0] === 0) x = x.slice(1);
    const buffer = new Uint8Array(32);
    const bstart = Math.max(0, 32 - x.length);
    buffer.set(x, bstart);
    return buffer;
  }
  function decode4(buffer) {
    const hashType = readUInt8(buffer, buffer.length - 1);
    if (!isDefinedHashType(hashType)) {
      throw new Error("Invalid hashType " + hashType);
    }
    const decoded = decode(buffer.subarray(0, -1));
    const r = fromDER(decoded.r);
    const s = fromDER(decoded.s);
    const signature2 = concat([r, s]);
    return { signature: signature2, hashType };
  }
  function encode4(signature2, hashType) {
    parse(
      object({
        signature: NBufferSchemaFactory(64),
        hashType: UInt8Schema
      }),
      { signature: signature2, hashType }
    );
    if (!isDefinedHashType(hashType)) {
      throw new Error("Invalid hashType " + hashType);
    }
    const hashTypeBuffer = new Uint8Array(1);
    writeUInt8(hashTypeBuffer, 0, hashType);
    const r = toDER(signature2.slice(0, 32));
    const s = toDER(signature2.slice(32, 64));
    return concat([encode(r, s), hashTypeBuffer]);
  }

  // node_modules/bitcoinjs-lib/src/esm/script.js
  var OP_INT_BASE = OPS.OP_RESERVED;
  var StackSchema = array(union([instance(Uint8Array), number()]));
  function isOPInt(value2) {
    return is(number(), value2) && (value2 === OPS.OP_0 || value2 >= OPS.OP_1 && value2 <= OPS.OP_16 || value2 === OPS.OP_1NEGATE);
  }
  function isPushOnlyChunk(value2) {
    return is(BufferSchema, value2) || isOPInt(value2);
  }
  function isPushOnly(value2) {
    return is(pipe(any(), everyItem(isPushOnlyChunk)), value2);
  }
  function countNonPushOnlyOPs(value2) {
    return value2.length - value2.filter(isPushOnlyChunk).length;
  }
  function asMinimalOP(buffer) {
    if (buffer.length === 0) return OPS.OP_0;
    if (buffer.length !== 1) return;
    if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
    if (buffer[0] === 129) return OPS.OP_1NEGATE;
  }
  function chunksIsBuffer(buf) {
    return buf instanceof Uint8Array;
  }
  function chunksIsArray(buf) {
    return is(StackSchema, buf);
  }
  function singleChunkIsBuffer(buf) {
    return buf instanceof Uint8Array;
  }
  function compile(chunks) {
    if (chunksIsBuffer(chunks)) return chunks;
    parse(StackSchema, chunks);
    const bufferSize = chunks.reduce((accum, chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        if (chunk.length === 1 && asMinimalOP(chunk) !== void 0) {
          return accum + 1;
        }
        return accum + encodingLength(chunk.length) + chunk.length;
      }
      return accum + 1;
    }, 0);
    const buffer = new Uint8Array(bufferSize);
    let offset = 0;
    chunks.forEach((chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        const opcode = asMinimalOP(chunk);
        if (opcode !== void 0) {
          writeUInt8(buffer, offset, opcode);
          offset += 1;
          return;
        }
        offset += encode2(buffer, chunk.length, offset);
        buffer.set(chunk, offset);
        offset += chunk.length;
      } else {
        writeUInt8(buffer, offset, chunk);
        offset += 1;
      }
    });
    if (offset !== buffer.length) throw new Error("Could not decode chunks");
    return buffer;
  }
  function decompile(buffer) {
    if (chunksIsArray(buffer)) return buffer;
    parse(BufferSchema, buffer);
    const chunks = [];
    let i = 0;
    while (i < buffer.length) {
      const opcode = buffer[i];
      if (opcode > OPS.OP_0 && opcode <= OPS.OP_PUSHDATA4) {
        const d = decode2(buffer, i);
        if (d === null) return null;
        i += d.size;
        if (i + d.number > buffer.length) return null;
        const data = buffer.slice(i, i + d.number);
        i += d.number;
        const op = asMinimalOP(data);
        if (op !== void 0) {
          chunks.push(op);
        } else {
          chunks.push(data);
        }
      } else {
        chunks.push(opcode);
        i += 1;
      }
    }
    return chunks;
  }
  function toASM(chunks) {
    if (chunksIsBuffer(chunks)) {
      chunks = decompile(chunks);
    }
    if (!chunks) {
      throw new Error("Could not convert invalid chunks to ASM");
    }
    return chunks.map((chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        const op = asMinimalOP(chunk);
        if (op === void 0) return toHex(chunk);
        chunk = op;
      }
      return OPS[chunk];
    }).join(" ");
  }
  function toStack(chunks) {
    chunks = decompile(chunks);
    parse(custom(isPushOnly), chunks);
    return chunks.map((op) => {
      if (singleChunkIsBuffer(op)) return op;
      if (op === OPS.OP_0) return new Uint8Array(0);
      return encode3(op - OP_INT_BASE);
    });
  }
  function isCanonicalPubKey(buffer) {
    return isPoint(buffer);
  }
  function isDefinedHashType(hashType) {
    const hashTypeMod = hashType & ~128;
    return hashTypeMod > 0 && hashTypeMod < 4;
  }
  function isCanonicalScriptSignature(buffer) {
    if (!(buffer instanceof Uint8Array)) return false;
    if (!isDefinedHashType(buffer[buffer.length - 1])) return false;
    return check(buffer.slice(0, -1));
  }
  var signature = script_signature_exports;

  // node_modules/bitcoinjs-lib/src/esm/payments/lazy.js
  function prop(object2, name, f) {
    Object.defineProperty(object2, name, {
      configurable: true,
      enumerable: true,
      get() {
        const _value = f.call(this);
        this[name] = _value;
        return _value;
      },
      set(_value) {
        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          value: _value,
          writable: true
        });
      }
    });
  }
  function value(f) {
    let _value;
    return () => {
      if (_value !== void 0) return _value;
      _value = f();
      return _value;
    };
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2ms.js
  var OPS2 = OPS;
  var OP_INT_BASE2 = OPS2.OP_RESERVED;
  function encodeSmallOrScriptNum(n) {
    return n <= 16 ? OP_INT_BASE2 + n : encode3(n);
  }
  function decodeSmallOrScriptNum(chunk) {
    if (typeof chunk === "number") {
      const val = chunk - OP_INT_BASE2;
      if (val < 1 || val > 16)
        throw new TypeError(`Invalid opcode: expected OP_1\u2013OP_16, got ${chunk}`);
      return val;
    } else return decode3(chunk);
  }
  function isSmallOrScriptNum(chunk) {
    if (typeof chunk === "number")
      return chunk - OP_INT_BASE2 >= 1 && chunk - OP_INT_BASE2 <= 16;
    else return Number.isInteger(decode3(chunk));
  }
  function p2ms(a, opts) {
    if (!a.input && !a.output && !(a.pubkeys && a.m !== void 0) && !a.signatures)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    function isAcceptableSignature(x) {
      return isCanonicalScriptSignature(x) || (opts.allowIncomplete && x === OPS2.OP_0) !== void 0;
    }
    parse(
      partial(
        object({
          network: object({}),
          m: number(),
          n: number(),
          output: BufferSchema,
          pubkeys: array(custom(isPoint), "Received invalid pubkey"),
          signatures: array(
            custom(isAcceptableSignature),
            "Expected signature to be of type isAcceptableSignature"
          ),
          input: BufferSchema
        })
      ),
      a
    );
    const network = a.network || bitcoin;
    const o = { network };
    let chunks = [];
    let decoded = false;
    function decode20(output) {
      if (decoded) return;
      decoded = true;
      chunks = decompile(output);
      if (chunks.length < 3) throw new TypeError("Output is invalid");
      o.m = decodeSmallOrScriptNum(chunks[0]);
      o.n = decodeSmallOrScriptNum(chunks[chunks.length - 2]);
      o.pubkeys = chunks.slice(1, -2);
    }
    prop(o, "output", () => {
      if (!a.m) return;
      if (!o.n) return;
      if (!a.pubkeys) return;
      return compile(
        [].concat(
          encodeSmallOrScriptNum(a.m),
          a.pubkeys,
          encodeSmallOrScriptNum(o.n),
          OPS2.OP_CHECKMULTISIG
        )
      );
    });
    prop(o, "m", () => {
      if (!o.output) return;
      decode20(o.output);
      return o.m;
    });
    prop(o, "n", () => {
      if (!o.pubkeys) return;
      return o.pubkeys.length;
    });
    prop(o, "pubkeys", () => {
      if (!a.output) return;
      decode20(a.output);
      return o.pubkeys;
    });
    prop(o, "signatures", () => {
      if (!a.input) return;
      return decompile(a.input).slice(1);
    });
    prop(o, "input", () => {
      if (!a.signatures) return;
      return compile([OPS2.OP_0].concat(a.signatures));
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    prop(o, "name", () => {
      if (!o.m || !o.n) return;
      return `p2ms(${o.m} of ${o.n})`;
    });
    if (opts.validate) {
      if (a.output) {
        decode20(a.output);
        if (!isSmallOrScriptNum(chunks[0]))
          throw new TypeError("Output is invalid");
        if (!isSmallOrScriptNum(chunks[chunks.length - 2]))
          throw new TypeError("Output is invalid");
        if (chunks[chunks.length - 1] !== OPS2.OP_CHECKMULTISIG)
          throw new TypeError("Output is invalid");
        if (o.m <= 0 || o.n > 20 || o.m > o.n || o.n !== chunks.length - 3)
          throw new TypeError("Output is invalid");
        if (!o.pubkeys.every((x) => isPoint(x)))
          throw new TypeError("Output is invalid");
        if (a.m !== void 0 && a.m !== o.m) throw new TypeError("m mismatch");
        if (a.n !== void 0 && a.n !== o.n) throw new TypeError("n mismatch");
        if (a.pubkeys && !stacksEqual(a.pubkeys, o.pubkeys))
          throw new TypeError("Pubkeys mismatch");
      }
      if (a.pubkeys) {
        if (a.n !== void 0 && a.n !== a.pubkeys.length)
          throw new TypeError("Pubkey count mismatch");
        o.n = a.pubkeys.length;
        if (o.n < o.m) throw new TypeError("Pubkey count cannot be less than m");
      }
      if (a.signatures) {
        if (a.signatures.length < o.m)
          throw new TypeError("Not enough signatures provided");
        if (a.signatures.length > o.m)
          throw new TypeError("Too many signatures provided");
      }
      if (a.input) {
        if (a.input[0] !== OPS2.OP_0) throw new TypeError("Input is invalid");
        if (o.signatures.length === 0 || !o.signatures.every(isAcceptableSignature))
          throw new TypeError("Input has invalid signature(s)");
        if (a.signatures && !stacksEqual(a.signatures, o.signatures))
          throw new TypeError("Signature mismatch");
        if (a.m !== void 0 && a.m !== a.signatures.length)
          throw new TypeError("Signature count mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2pk.js
  var OPS3 = OPS;
  function p2pk(a, opts) {
    if (!a.input && !a.output && !a.pubkey && !a.input && !a.signature)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          output: BufferSchema,
          pubkey: custom(isPoint, "invalid pubkey"),
          signature: custom(
            isCanonicalScriptSignature,
            "Expected signature to be of type isCanonicalScriptSignature"
          ),
          input: BufferSchema
        })
      ),
      a
    );
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const network = a.network || bitcoin;
    const o = { name: "p2pk", network };
    prop(o, "output", () => {
      if (!a.pubkey) return;
      return compile([a.pubkey, OPS3.OP_CHECKSIG]);
    });
    prop(o, "pubkey", () => {
      if (!a.output) return;
      return a.output.slice(1, -1);
    });
    prop(o, "signature", () => {
      if (!a.input) return;
      return _chunks()[0];
    });
    prop(o, "input", () => {
      if (!a.signature) return;
      return compile([a.signature]);
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    if (opts.validate) {
      if (a.output) {
        if (a.output[a.output.length - 1] !== OPS3.OP_CHECKSIG)
          throw new TypeError("Output is invalid");
        if (!isPoint(o.pubkey)) throw new TypeError("Output pubkey is invalid");
        if (a.pubkey && compare(a.pubkey, o.pubkey) !== 0)
          throw new TypeError("Pubkey mismatch");
      }
      if (a.signature) {
        if (a.input && compare(a.input, o.input) !== 0)
          throw new TypeError("Signature mismatch");
      }
      if (a.input) {
        if (_chunks().length !== 1) throw new TypeError("Input is invalid");
        if (!isCanonicalScriptSignature(o.signature))
          throw new TypeError("Input has invalid signature");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/@noble/hashes/esm/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function abytes(b, ...lengths) {
    if (!isBytes(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function aexists(instance2, checkFinished = true) {
    if (instance2.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance2.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance2) {
    abytes(out);
    const min = instance2.outputLen;
    if (out.length < min) {
      throw new Error("digestInto() expects output buffer of length at least " + min);
    }
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function rotl(word, shift) {
    return word << shift | word >>> 32 - shift >>> 0;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new Error("string expected");
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes(data);
    return data;
  }
  var Hash = class {
  };
  function createHasher(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // node_modules/@noble/hashes/esm/_md.js
  function setBigUint64(view, byteOffset, value2, isLE) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value2, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value2 >> _32n & _u32_max);
    const wl = Number(value2 & _u32_max);
    const h2 = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h2, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
  }
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
      super();
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes(data);
      abytes(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos; i < blockLen; i++)
        buffer[i] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length: length2, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length2;
      to.pos = pos;
      if (length2 % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);

  // node_modules/@noble/hashes/esm/legacy.js
  var Rho160 = /* @__PURE__ */ Uint8Array.from([
    7,
    4,
    13,
    1,
    10,
    6,
    15,
    3,
    12,
    0,
    9,
    5,
    2,
    14,
    11,
    8
  ]);
  var Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
  var Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
  var idxLR = /* @__PURE__ */ (() => {
    const L = [Id160];
    const R = [Pi160];
    const res = [L, R];
    for (let i = 0; i < 4; i++)
      for (let j of res)
        j.push(j[i].map((k) => Rho160[k]));
    return res;
  })();
  var idxL = /* @__PURE__ */ (() => idxLR[0])();
  var idxR = /* @__PURE__ */ (() => idxLR[1])();
  var shifts160 = /* @__PURE__ */ [
    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
    [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
    [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
    [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
    [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
  ].map((i) => Uint8Array.from(i));
  var shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
  var shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
  var Kl160 = /* @__PURE__ */ Uint32Array.from([
    0,
    1518500249,
    1859775393,
    2400959708,
    2840853838
  ]);
  var Kr160 = /* @__PURE__ */ Uint32Array.from([
    1352829926,
    1548603684,
    1836072691,
    2053994217,
    0
  ]);
  function ripemd_f(group, x, y, z) {
    if (group === 0)
      return x ^ y ^ z;
    if (group === 1)
      return x & y | ~x & z;
    if (group === 2)
      return (x | ~y) ^ z;
    if (group === 3)
      return x & z | y & ~z;
    return x ^ (y | ~z);
  }
  var BUF_160 = /* @__PURE__ */ new Uint32Array(16);
  var RIPEMD160 = class extends HashMD {
    constructor() {
      super(64, 20, 8, true);
      this.h0 = 1732584193 | 0;
      this.h1 = 4023233417 | 0;
      this.h2 = 2562383102 | 0;
      this.h3 = 271733878 | 0;
      this.h4 = 3285377520 | 0;
    }
    get() {
      const { h0, h1, h2, h3, h4 } = this;
      return [h0, h1, h2, h3, h4];
    }
    set(h0, h1, h2, h3, h4) {
      this.h0 = h0 | 0;
      this.h1 = h1 | 0;
      this.h2 = h2 | 0;
      this.h3 = h3 | 0;
      this.h4 = h4 | 0;
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        BUF_160[i] = view.getUint32(offset, true);
      let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
      for (let group = 0; group < 5; group++) {
        const rGroup = 4 - group;
        const hbl = Kl160[group], hbr = Kr160[group];
        const rl = idxL[group], rr = idxR[group];
        const sl = shiftsL160[group], sr = shiftsR160[group];
        for (let i = 0; i < 16; i++) {
          const tl = rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
          al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
        }
        for (let i = 0; i < 16; i++) {
          const tr = rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
          ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr;
        }
      }
      this.set(this.h1 + cl + dr | 0, this.h2 + dl + er | 0, this.h3 + el + ar | 0, this.h4 + al + br | 0, this.h0 + bl + cr | 0);
    }
    roundClean() {
      clean(BUF_160);
    }
    destroy() {
      this.destroyed = true;
      clean(this.buffer);
      this.set(0, 0, 0, 0, 0);
    }
  };
  var ripemd160 = /* @__PURE__ */ createHasher(() => new RIPEMD160());

  // node_modules/@noble/hashes/esm/ripemd160.js
  var ripemd1602 = ripemd160;

  // node_modules/@noble/hashes/esm/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA256 = class extends HashMD {
    constructor(outputLen = 32) {
      super(64, outputLen, 8, false);
      this.A = SHA256_IV[0] | 0;
      this.B = SHA256_IV[1] | 0;
      this.C = SHA256_IV[2] | 0;
      this.D = SHA256_IV[3] | 0;
      this.E = SHA256_IV[4] | 0;
      this.F = SHA256_IV[5] | 0;
      this.G = SHA256_IV[6] | 0;
      this.H = SHA256_IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());

  // node_modules/@noble/hashes/esm/sha256.js
  var sha2562 = sha256;

  // node_modules/bitcoinjs-lib/src/esm/crypto.js
  function hash160(buffer) {
    return ripemd1602(sha2562(buffer));
  }
  function hash256(buffer) {
    return sha2562(sha2562(buffer));
  }
  var TAGGED_HASH_PREFIXES = {
    "BIP0340/challenge": Uint8Array.from([
      123,
      181,
      45,
      122,
      159,
      239,
      88,
      50,
      62,
      177,
      191,
      122,
      64,
      125,
      179,
      130,
      210,
      243,
      242,
      216,
      27,
      177,
      34,
      79,
      73,
      254,
      81,
      143,
      109,
      72,
      211,
      124,
      123,
      181,
      45,
      122,
      159,
      239,
      88,
      50,
      62,
      177,
      191,
      122,
      64,
      125,
      179,
      130,
      210,
      243,
      242,
      216,
      27,
      177,
      34,
      79,
      73,
      254,
      81,
      143,
      109,
      72,
      211,
      124
    ]),
    "BIP0340/aux": Uint8Array.from([
      241,
      239,
      78,
      94,
      192,
      99,
      202,
      218,
      109,
      148,
      202,
      250,
      157,
      152,
      126,
      160,
      105,
      38,
      88,
      57,
      236,
      193,
      31,
      151,
      45,
      119,
      165,
      46,
      216,
      193,
      204,
      144,
      241,
      239,
      78,
      94,
      192,
      99,
      202,
      218,
      109,
      148,
      202,
      250,
      157,
      152,
      126,
      160,
      105,
      38,
      88,
      57,
      236,
      193,
      31,
      151,
      45,
      119,
      165,
      46,
      216,
      193,
      204,
      144
    ]),
    "BIP0340/nonce": Uint8Array.from([
      7,
      73,
      119,
      52,
      167,
      155,
      203,
      53,
      91,
      155,
      140,
      125,
      3,
      79,
      18,
      28,
      244,
      52,
      215,
      62,
      247,
      45,
      218,
      25,
      135,
      0,
      97,
      251,
      82,
      191,
      235,
      47,
      7,
      73,
      119,
      52,
      167,
      155,
      203,
      53,
      91,
      155,
      140,
      125,
      3,
      79,
      18,
      28,
      244,
      52,
      215,
      62,
      247,
      45,
      218,
      25,
      135,
      0,
      97,
      251,
      82,
      191,
      235,
      47
    ]),
    TapLeaf: Uint8Array.from([
      174,
      234,
      143,
      220,
      66,
      8,
      152,
      49,
      5,
      115,
      75,
      88,
      8,
      29,
      30,
      38,
      56,
      211,
      95,
      28,
      181,
      64,
      8,
      212,
      211,
      87,
      202,
      3,
      190,
      120,
      233,
      238,
      174,
      234,
      143,
      220,
      66,
      8,
      152,
      49,
      5,
      115,
      75,
      88,
      8,
      29,
      30,
      38,
      56,
      211,
      95,
      28,
      181,
      64,
      8,
      212,
      211,
      87,
      202,
      3,
      190,
      120,
      233,
      238
    ]),
    TapBranch: Uint8Array.from([
      25,
      65,
      161,
      242,
      229,
      110,
      185,
      95,
      162,
      169,
      241,
      148,
      190,
      92,
      1,
      247,
      33,
      111,
      51,
      237,
      130,
      176,
      145,
      70,
      52,
      144,
      208,
      91,
      245,
      22,
      160,
      21,
      25,
      65,
      161,
      242,
      229,
      110,
      185,
      95,
      162,
      169,
      241,
      148,
      190,
      92,
      1,
      247,
      33,
      111,
      51,
      237,
      130,
      176,
      145,
      70,
      52,
      144,
      208,
      91,
      245,
      22,
      160,
      21
    ]),
    TapSighash: Uint8Array.from([
      244,
      10,
      72,
      223,
      75,
      42,
      112,
      200,
      180,
      146,
      75,
      242,
      101,
      70,
      97,
      237,
      61,
      149,
      253,
      102,
      163,
      19,
      235,
      135,
      35,
      117,
      151,
      198,
      40,
      228,
      160,
      49,
      244,
      10,
      72,
      223,
      75,
      42,
      112,
      200,
      180,
      146,
      75,
      242,
      101,
      70,
      97,
      237,
      61,
      149,
      253,
      102,
      163,
      19,
      235,
      135,
      35,
      117,
      151,
      198,
      40,
      228,
      160,
      49
    ]),
    TapTweak: Uint8Array.from([
      232,
      15,
      225,
      99,
      156,
      156,
      160,
      80,
      227,
      175,
      27,
      57,
      193,
      67,
      198,
      62,
      66,
      156,
      188,
      235,
      21,
      217,
      64,
      251,
      181,
      197,
      161,
      244,
      175,
      87,
      197,
      233,
      232,
      15,
      225,
      99,
      156,
      156,
      160,
      80,
      227,
      175,
      27,
      57,
      193,
      67,
      198,
      62,
      66,
      156,
      188,
      235,
      21,
      217,
      64,
      251,
      181,
      197,
      161,
      244,
      175,
      87,
      197,
      233
    ]),
    "KeyAgg list": Uint8Array.from([
      72,
      28,
      151,
      28,
      60,
      11,
      70,
      215,
      240,
      178,
      117,
      174,
      89,
      141,
      78,
      44,
      126,
      215,
      49,
      156,
      89,
      74,
      92,
      110,
      199,
      158,
      160,
      212,
      153,
      2,
      148,
      240,
      72,
      28,
      151,
      28,
      60,
      11,
      70,
      215,
      240,
      178,
      117,
      174,
      89,
      141,
      78,
      44,
      126,
      215,
      49,
      156,
      89,
      74,
      92,
      110,
      199,
      158,
      160,
      212,
      153,
      2,
      148,
      240
    ]),
    "KeyAgg coefficient": Uint8Array.from([
      191,
      201,
      4,
      3,
      77,
      28,
      136,
      232,
      200,
      14,
      34,
      229,
      61,
      36,
      86,
      109,
      100,
      130,
      78,
      214,
      66,
      114,
      129,
      192,
      145,
      0,
      249,
      77,
      205,
      82,
      201,
      129,
      191,
      201,
      4,
      3,
      77,
      28,
      136,
      232,
      200,
      14,
      34,
      229,
      61,
      36,
      86,
      109,
      100,
      130,
      78,
      214,
      66,
      114,
      129,
      192,
      145,
      0,
      249,
      77,
      205,
      82,
      201,
      129
    ])
  };
  function taggedHash(prefix, data) {
    return sha2562(concat([TAGGED_HASH_PREFIXES[prefix], data]));
  }

  // node_modules/base-x/src/esm/index.js
  function base(ALPHABET2) {
    if (ALPHABET2.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    const BASE_MAP = new Uint8Array(256);
    for (let j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (let i = 0; i < ALPHABET2.length; i++) {
      const x = ALPHABET2.charAt(i);
      const xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i;
    }
    const BASE = ALPHABET2.length;
    const LEADER = ALPHABET2.charAt(0);
    const FACTOR = Math.log(BASE) / Math.log(256);
    const iFACTOR = Math.log(256) / Math.log(BASE);
    function encode21(source) {
      if (source instanceof Uint8Array) {
      } else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      let zeroes = 0;
      let length2 = 0;
      let pbegin = 0;
      const pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      const size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      const b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        let carry = source[pbegin];
        let i = 0;
        for (let it1 = size - 1; (carry !== 0 || i < length2) && it1 !== -1; it1--, i++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i;
        pbegin++;
      }
      let it2 = size - length2;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      let str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET2.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      let psz = 0;
      let zeroes = 0;
      let length2 = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      const size = (source.length - psz) * FACTOR + 1 >>> 0;
      const b256 = new Uint8Array(size);
      while (psz < source.length) {
        const charCode = source.charCodeAt(psz);
        if (charCode > 255) {
          return;
        }
        let carry = BASE_MAP[charCode];
        if (carry === 255) {
          return;
        }
        let i = 0;
        for (let it3 = size - 1; (carry !== 0 || i < length2) && it3 !== -1; it3--, i++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i;
        psz++;
      }
      let it4 = size - length2;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      const vch = new Uint8Array(zeroes + (size - it4));
      let j = zeroes;
      while (it4 !== size) {
        vch[j++] = b256[it4++];
      }
      return vch;
    }
    function decode20(string2) {
      const buffer = decodeUnsafe(string2);
      if (buffer) {
        return buffer;
      }
      throw new Error("Non-base" + BASE + " character");
    }
    return {
      encode: encode21,
      decodeUnsafe,
      decode: decode20
    };
  }
  var esm_default = base;

  // node_modules/bs58/src/esm/index.js
  var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var esm_default2 = esm_default(ALPHABET);

  // node_modules/bs58check/src/esm/base.js
  function base_default(checksumFn) {
    function encode21(payload) {
      var payloadU8 = Uint8Array.from(payload);
      var checksum = checksumFn(payloadU8);
      var length2 = payloadU8.length + 4;
      var both = new Uint8Array(length2);
      both.set(payloadU8, 0);
      both.set(checksum.subarray(0, 4), payloadU8.length);
      return esm_default2.encode(both);
    }
    function decodeRaw2(buffer) {
      var payload = buffer.slice(0, -4);
      var checksum = buffer.slice(-4);
      var newChecksum = checksumFn(payload);
      if (checksum[0] ^ newChecksum[0] | checksum[1] ^ newChecksum[1] | checksum[2] ^ newChecksum[2] | checksum[3] ^ newChecksum[3])
        return;
      return payload;
    }
    function decodeUnsafe(str) {
      var buffer = esm_default2.decodeUnsafe(str);
      if (buffer == null)
        return;
      return decodeRaw2(buffer);
    }
    function decode20(str) {
      var buffer = esm_default2.decode(str);
      var payload = decodeRaw2(buffer);
      if (payload == null)
        throw new Error("Invalid checksum");
      return payload;
    }
    return {
      encode: encode21,
      decode: decode20,
      decodeUnsafe
    };
  }

  // node_modules/bs58check/src/esm/index.js
  function sha256x2(buffer) {
    return sha2562(sha2562(buffer));
  }
  var esm_default3 = base_default(sha256x2);

  // node_modules/bitcoinjs-lib/src/esm/payments/p2pkh.js
  var OPS4 = OPS;
  function p2pkh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.pubkey && !a.input)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          address: string(),
          hash: Hash160bitSchema,
          output: NBufferSchemaFactory(25),
          pubkey: custom(isPoint),
          signature: custom(isCanonicalScriptSignature),
          input: BufferSchema
        })
      ),
      a
    );
    const _address = value(() => {
      const payload = esm_default3.decode(a.address);
      const version = readUInt8(payload, 0);
      const hash = payload.slice(1);
      return { version, hash };
    });
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const network = a.network || bitcoin;
    const o = { name: "p2pkh", network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const payload = new Uint8Array(21);
      writeUInt8(payload, 0, network.pubKeyHash);
      payload.set(o.hash, 1);
      return esm_default3.encode(payload);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(3, 23);
      if (a.address) return _address().hash;
      if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([
        OPS4.OP_DUP,
        OPS4.OP_HASH160,
        o.hash,
        OPS4.OP_EQUALVERIFY,
        OPS4.OP_CHECKSIG
      ]);
    });
    prop(o, "pubkey", () => {
      if (!a.input) return;
      return _chunks()[1];
    });
    prop(o, "signature", () => {
      if (!a.input) return;
      return _chunks()[0];
    });
    prop(o, "input", () => {
      if (!a.pubkey) return;
      if (!a.signature) return;
      return compile([a.signature, a.pubkey]);
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().version !== network.pubKeyHash)
          throw new TypeError("Invalid version or Network mismatch");
        if (_address().hash.length !== 20) throw new TypeError("Invalid address");
        hash = _address().hash;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 25 || a.output[0] !== OPS4.OP_DUP || a.output[1] !== OPS4.OP_HASH160 || a.output[2] !== 20 || a.output[23] !== OPS4.OP_EQUALVERIFY || a.output[24] !== OPS4.OP_CHECKSIG)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(3, 23);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      if (a.pubkey) {
        const pkh = hash160(a.pubkey);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = pkh;
      }
      if (a.input) {
        const chunks = _chunks();
        if (chunks.length !== 2) throw new TypeError("Input is invalid");
        if (!isCanonicalScriptSignature(chunks[0]))
          throw new TypeError("Input has invalid signature");
        if (!isPoint(chunks[1])) throw new TypeError("Input has invalid pubkey");
        if (a.signature && compare(a.signature, chunks[0]) !== 0)
          throw new TypeError("Signature mismatch");
        if (a.pubkey && compare(a.pubkey, chunks[1]) !== 0)
          throw new TypeError("Pubkey mismatch");
        const pkh = hash160(chunks[1]);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2sh.js
  var OPS5 = OPS;
  function p2sh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.redeem && !a.input)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          address: string(),
          hash: NBufferSchemaFactory(20),
          output: NBufferSchemaFactory(23),
          redeem: partial(
            object({
              network: object({}),
              output: BufferSchema,
              input: BufferSchema,
              witness: array(BufferSchema)
            })
          ),
          input: BufferSchema,
          witness: array(BufferSchema)
        })
      ),
      a
    );
    let network = a.network;
    if (!network) {
      network = a.redeem && a.redeem.network || bitcoin;
    }
    const o = { network };
    const _address = value(() => {
      const payload = esm_default3.decode(a.address);
      const version = readUInt8(payload, 0);
      const hash = payload.slice(1);
      return { version, hash };
    });
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const _redeem = value(() => {
      const chunks = _chunks();
      const lastChunk = chunks[chunks.length - 1];
      return {
        network,
        output: lastChunk === OPS5.OP_FALSE ? Uint8Array.from([]) : lastChunk,
        input: compile(chunks.slice(0, -1)),
        witness: a.witness || []
      };
    });
    prop(o, "address", () => {
      if (!o.hash) return;
      const payload = new Uint8Array(21);
      writeUInt8(payload, 0, o.network.scriptHash);
      payload.set(o.hash, 1);
      return esm_default3.encode(payload);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2, 22);
      if (a.address) return _address().hash;
      if (o.redeem && o.redeem.output) return hash160(o.redeem.output);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS5.OP_HASH160, o.hash, OPS5.OP_EQUAL]);
    });
    prop(o, "redeem", () => {
      if (!a.input) return;
      return _redeem();
    });
    prop(o, "input", () => {
      if (!a.redeem || !a.redeem.input || !a.redeem.output) return;
      return compile(
        [].concat(decompile(a.redeem.input), a.redeem.output)
      );
    });
    prop(o, "witness", () => {
      if (o.redeem && o.redeem.witness) return o.redeem.witness;
      if (o.input) return [];
    });
    prop(o, "name", () => {
      const nameParts = ["p2sh"];
      if (o.redeem !== void 0 && o.redeem.name !== void 0)
        nameParts.push(o.redeem.name);
      return nameParts.join("-");
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().version !== network.scriptHash)
          throw new TypeError("Invalid version or Network mismatch");
        if (_address().hash.length !== 20) throw new TypeError("Invalid address");
        hash = _address().hash;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 23 || a.output[0] !== OPS5.OP_HASH160 || a.output[1] !== 20 || a.output[22] !== OPS5.OP_EQUAL)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(2, 22);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      const checkRedeem = (redeem) => {
        if (redeem.output) {
          const decompile2 = decompile(redeem.output);
          if (!decompile2 || decompile2.length < 1)
            throw new TypeError("Redeem.output too short");
          if (redeem.output.byteLength > 520)
            throw new TypeError(
              "Redeem.output unspendable if larger than 520 bytes"
            );
          if (countNonPushOnlyOPs(decompile2) > 201)
            throw new TypeError(
              "Redeem.output unspendable with more than 201 non-push ops"
            );
          const hash2 = hash160(redeem.output);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError("Hash mismatch");
          else hash = hash2;
        }
        if (redeem.input) {
          const hasInput = redeem.input.length > 0;
          const hasWitness = redeem.witness && redeem.witness.length > 0;
          if (!hasInput && !hasWitness) throw new TypeError("Empty input");
          if (hasInput && hasWitness)
            throw new TypeError("Input and witness provided");
          if (hasInput) {
            const richunks = decompile(redeem.input);
            if (!isPushOnly(richunks))
              throw new TypeError("Non push-only scriptSig");
          }
        }
      };
      if (a.input) {
        const chunks = _chunks();
        if (!chunks || chunks.length < 1) throw new TypeError("Input too short");
        if (!(_redeem().output instanceof Uint8Array))
          throw new TypeError("Input is invalid");
        checkRedeem(_redeem());
      }
      if (a.redeem) {
        if (a.redeem.network && a.redeem.network !== network)
          throw new TypeError("Network mismatch");
        if (a.input) {
          const redeem = _redeem();
          if (a.redeem.output && compare(a.redeem.output, redeem.output) !== 0)
            throw new TypeError("Redeem.output mismatch");
          if (a.redeem.input && compare(a.redeem.input, redeem.input) !== 0)
            throw new TypeError("Redeem.input mismatch");
        }
        checkRedeem(a.redeem);
      }
      if (a.witness) {
        if (a.redeem && a.redeem.witness && !stacksEqual(a.redeem.witness, a.witness))
          throw new TypeError("Witness and redeem.witness mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2wpkh.js
  var import_bech32 = __toESM(require_dist(), 1);
  var OPS6 = OPS;
  var EMPTY_BUFFER = new Uint8Array(0);
  function p2wpkh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.pubkey && !a.witness)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          address: string(),
          hash: NBufferSchemaFactory(20),
          input: NBufferSchemaFactory(0),
          network: object({}),
          output: NBufferSchemaFactory(22),
          pubkey: custom(isPoint, "Not a valid pubkey"),
          signature: custom(isCanonicalScriptSignature),
          witness: array(BufferSchema)
        })
      ),
      a
    );
    const _address = value(() => {
      const result = import_bech32.bech32.decode(a.address);
      const version = result.words.shift();
      const data = import_bech32.bech32.fromWords(result.words);
      return {
        version,
        prefix: result.prefix,
        data: Uint8Array.from(data)
      };
    });
    const network = a.network || bitcoin;
    const o = { name: "p2wpkh", network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const words = import_bech32.bech32.toWords(o.hash);
      words.unshift(0);
      return import_bech32.bech32.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2, 22);
      if (a.address) return _address().data;
      if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS6.OP_0, o.hash]);
    });
    prop(o, "pubkey", () => {
      if (a.pubkey) return a.pubkey;
      if (!a.witness) return;
      return a.witness[1];
    });
    prop(o, "signature", () => {
      if (!a.witness) return;
      return a.witness[0];
    });
    prop(o, "input", () => {
      if (!o.witness) return;
      return EMPTY_BUFFER;
    });
    prop(o, "witness", () => {
      if (!a.pubkey) return;
      if (!a.signature) return;
      return [a.signature, a.pubkey];
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (network && network.bech32 !== _address().prefix)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== 0)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 20)
          throw new TypeError("Invalid address data");
        hash = _address().data;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 22 || a.output[0] !== OPS6.OP_0 || a.output[1] !== 20)
          throw new TypeError("Output is invalid");
        if (hash.length > 0 && compare(hash, a.output.slice(2)) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.output.slice(2);
      }
      if (a.pubkey) {
        const pkh = hash160(a.pubkey);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = pkh;
        if (!isPoint(a.pubkey) || a.pubkey.length !== 33)
          throw new TypeError("Invalid pubkey for p2wpkh");
      }
      if (a.witness) {
        if (a.witness.length !== 2) throw new TypeError("Witness is invalid");
        if (!isCanonicalScriptSignature(a.witness[0]))
          throw new TypeError("Witness has invalid signature");
        if (!isPoint(a.witness[1]) || a.witness[1].length !== 33)
          throw new TypeError("Witness has invalid pubkey");
        if (a.signature && compare(a.signature, a.witness[0]) !== 0)
          throw new TypeError("Signature mismatch");
        if (a.pubkey && compare(a.pubkey, a.witness[1]) !== 0)
          throw new TypeError("Pubkey mismatch");
        const pkh = hash160(a.witness[1]);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2wsh.js
  var import_bech322 = __toESM(require_dist(), 1);
  var OPS7 = OPS;
  var EMPTY_BUFFER2 = new Uint8Array(0);
  function chunkHasUncompressedPubkey(chunk) {
    if (chunk instanceof Uint8Array && chunk.length === 65 && chunk[0] === 4 && isPoint(chunk)) {
      return true;
    } else {
      return false;
    }
  }
  function p2wsh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.redeem && !a.witness)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      NullablePartial({
        network: object({}),
        address: string(),
        hash: Buffer256bitSchema,
        output: NBufferSchemaFactory(34),
        redeem: NullablePartial({
          input: BufferSchema,
          network: object({}),
          output: BufferSchema,
          witness: array(BufferSchema)
        }),
        input: NBufferSchemaFactory(0),
        witness: array(BufferSchema)
      }),
      a
    );
    const _address = value(() => {
      const result = import_bech322.bech32.decode(a.address);
      const version = result.words.shift();
      const data = import_bech322.bech32.fromWords(result.words);
      return {
        version,
        prefix: result.prefix,
        data: Uint8Array.from(data)
      };
    });
    const _rchunks = value(() => {
      return decompile(a.redeem.input);
    });
    let network = a.network;
    if (!network) {
      network = a.redeem && a.redeem.network || bitcoin;
    }
    const o = { network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const words = import_bech322.bech32.toWords(o.hash);
      words.unshift(0);
      return import_bech322.bech32.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2);
      if (a.address) return _address().data;
      if (o.redeem && o.redeem.output) return sha2562(o.redeem.output);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS7.OP_0, o.hash]);
    });
    prop(o, "redeem", () => {
      if (!a.witness) return;
      return {
        output: a.witness[a.witness.length - 1],
        input: EMPTY_BUFFER2,
        witness: a.witness.slice(0, -1)
      };
    });
    prop(o, "input", () => {
      if (!o.witness) return;
      return EMPTY_BUFFER2;
    });
    prop(o, "witness", () => {
      if (a.redeem && a.redeem.input && a.redeem.input.length > 0 && a.redeem.output && a.redeem.output.length > 0) {
        const stack = toStack(_rchunks());
        o.redeem = Object.assign({ witness: stack }, a.redeem);
        o.redeem.input = EMPTY_BUFFER2;
        return [].concat(stack, a.redeem.output);
      }
      if (!a.redeem) return;
      if (!a.redeem.output) return;
      if (!a.redeem.witness) return;
      return [].concat(a.redeem.witness, a.redeem.output);
    });
    prop(o, "name", () => {
      const nameParts = ["p2wsh"];
      if (o.redeem !== void 0 && o.redeem.name !== void 0)
        nameParts.push(o.redeem.name);
      return nameParts.join("-");
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().prefix !== network.bech32)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== 0)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 32)
          throw new TypeError("Invalid address data");
        hash = _address().data;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 34 || a.output[0] !== OPS7.OP_0 || a.output[1] !== 32)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(2);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      if (a.redeem) {
        if (a.redeem.network && a.redeem.network !== network)
          throw new TypeError("Network mismatch");
        if (a.redeem.input && a.redeem.input.length > 0 && a.redeem.witness && a.redeem.witness.length > 0)
          throw new TypeError("Ambiguous witness source");
        if (a.redeem.output) {
          const decompile2 = decompile(a.redeem.output);
          if (!decompile2 || decompile2.length < 1)
            throw new TypeError("Redeem.output is invalid");
          if (a.redeem.output.byteLength > 3600)
            throw new TypeError(
              "Redeem.output unspendable if larger than 3600 bytes"
            );
          if (countNonPushOnlyOPs(decompile2) > 201)
            throw new TypeError(
              "Redeem.output unspendable with more than 201 non-push ops"
            );
          const hash2 = sha2562(a.redeem.output);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError("Hash mismatch");
          else hash = hash2;
        }
        if (a.redeem.input && !isPushOnly(_rchunks()))
          throw new TypeError("Non push-only scriptSig");
        if (a.witness && a.redeem.witness && !stacksEqual(a.witness, a.redeem.witness))
          throw new TypeError("Witness and redeem.witness mismatch");
        if (a.redeem.input && _rchunks().some(chunkHasUncompressedPubkey) || a.redeem.output && (decompile(a.redeem.output) || []).some(
          chunkHasUncompressedPubkey
        )) {
          throw new TypeError(
            "redeem.input or redeem.output contains uncompressed pubkey"
          );
        }
      }
      if (a.witness && a.witness.length > 0) {
        const wScript = a.witness[a.witness.length - 1];
        if (a.redeem && a.redeem.output && compare(a.redeem.output, wScript) !== 0)
          throw new TypeError("Witness and redeem.output mismatch");
        if (a.witness.some(chunkHasUncompressedPubkey) || (decompile(wScript) || []).some(chunkHasUncompressedPubkey))
          throw new TypeError("Witness contains uncompressed pubkey");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/ecc_lib.js
  var _ECCLIB_CACHE = {};
  function getEccLib() {
    if (!_ECCLIB_CACHE.eccLib)
      throw new Error(
        "No ECC Library provided. You must call initEccLib() with a valid TinySecp256k1Interface instance"
      );
    return _ECCLIB_CACHE.eccLib;
  }

  // node_modules/varuint-bitcoin/src/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    decode: () => decode5,
    encode: () => encode5,
    encodingLength: () => encodingLength2
  });

  // node_modules/varuint-bitcoin/node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS2 = "0123456789abcdefABCDEF";
  var HEX_CODES2 = HEX_STRINGS2.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS2 = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS2.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER2 = new TextEncoder();
  var DECODER2 = new TextDecoder();
  function writeUInt162(buffer, offset, value2, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 65535) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${65535}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
    } else {
      buffer[offset] = value2 >> 8 & 255;
      buffer[offset + 1] = value2 & 255;
    }
    return offset + 2;
  }
  function writeUInt322(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function writeUInt642(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 0xffffffffffffffffn) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readUInt162(buffer, offset, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset + 1];
      num2 = (num2 << 8) + buffer[offset];
      return num2;
    } else {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset];
      num2 = (num2 << 8) + buffer[offset + 1];
      return num2;
    }
  }
  function readUInt322(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      return num2;
    } else {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      return num2;
    }
  }
  function readUInt64(buffer, offset, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0n;
      num2 = (num2 << 8n) + BigInt(buffer[offset + 7]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 6]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 5]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 4]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 3]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 2]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 1]);
      num2 = (num2 << 8n) + BigInt(buffer[offset]);
      return num2;
    } else {
      let num2 = 0n;
      num2 = (num2 << 8n) + BigInt(buffer[offset]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 1]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 2]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 3]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 4]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 5]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 6]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 7]);
      return num2;
    }
  }

  // node_modules/varuint-bitcoin/src/esm/index.js
  var checkUInt64 = (n) => {
    if (n < 0 || n > 0xffffffffffffffffn) {
      throw new RangeError("value out of range");
    }
  };
  function checkUInt53(n) {
    if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0)
      throw new RangeError("value out of range");
  }
  function checkUint53OrUint64(n) {
    if (typeof n === "number")
      checkUInt53(n);
    else
      checkUInt64(n);
  }
  function encode5(n, buffer, offset) {
    checkUint53OrUint64(n);
    if (offset === void 0)
      offset = 0;
    if (buffer === void 0) {
      buffer = new Uint8Array(encodingLength2(n));
    }
    let bytes = 0;
    if (n < 253) {
      buffer.set([Number(n)], offset);
      bytes = 1;
    } else if (n <= 65535) {
      buffer.set([253], offset);
      writeUInt162(buffer, offset + 1, Number(n), "LE");
      bytes = 3;
    } else if (n <= 4294967295) {
      buffer.set([254], offset);
      writeUInt322(buffer, offset + 1, Number(n), "LE");
      bytes = 5;
    } else {
      buffer.set([255], offset);
      writeUInt642(buffer, offset + 1, BigInt(n), "LE");
      bytes = 9;
    }
    return { buffer, bytes };
  }
  function decode5(buffer, offset) {
    if (offset === void 0)
      offset = 0;
    const first = buffer.at(offset);
    if (first === void 0)
      throw new Error("buffer too small");
    if (first < 253) {
      return { numberValue: first, bigintValue: BigInt(first), bytes: 1 };
    } else if (first === 253) {
      const val = readUInt162(buffer, offset + 1, "LE");
      return {
        numberValue: val,
        bigintValue: BigInt(val),
        bytes: 3
      };
    } else if (first === 254) {
      const val = readUInt322(buffer, offset + 1, "LE");
      return {
        numberValue: val,
        bigintValue: BigInt(val),
        bytes: 5
      };
    } else {
      const number2 = readUInt64(buffer, offset + 1, "LE");
      return { numberValue: number2 <= Number.MAX_SAFE_INTEGER ? Number(number2) : null, bigintValue: number2, bytes: 9 };
    }
  }
  function encodingLength2(n) {
    checkUint53OrUint64(n);
    return n < 253 ? 1 : n <= 65535 ? 3 : n <= 4294967295 ? 5 : 9;
  }

  // node_modules/bitcoinjs-lib/src/esm/bufferutils.js
  var MAX_JS_NUMBER = 9007199254740991;
  function verifuint(value2, max) {
    if (typeof value2 !== "number" && typeof value2 !== "bigint")
      throw new Error("cannot write a non-number as a number");
    if (value2 < 0 && value2 < BigInt(0))
      throw new Error("specified a negative value for writing an unsigned value");
    if (value2 > max && value2 > BigInt(max))
      throw new Error("RangeError: value out of range");
    if (Math.floor(Number(value2)) !== Number(value2))
      throw new Error("value has a fractional component");
  }
  function reverseBuffer(buffer) {
    if (buffer.length < 1) return buffer;
    let j = buffer.length - 1;
    let tmp = 0;
    for (let i = 0; i < buffer.length / 2; i++) {
      tmp = buffer[i];
      buffer[i] = buffer[j];
      buffer[j] = tmp;
      j--;
    }
    return buffer;
  }
  function cloneBuffer(buffer) {
    const clone = new Uint8Array(buffer.length);
    clone.set(buffer);
    return clone;
  }
  var BufferWriter = class _BufferWriter {
    constructor(buffer, offset = 0) {
      __publicField(this, "buffer");
      __publicField(this, "offset");
      this.buffer = buffer;
      this.offset = offset;
      parse(tuple([BufferSchema, UInt32Schema]), [
        buffer,
        offset
      ]);
    }
    static withCapacity(size) {
      return new _BufferWriter(new Uint8Array(size));
    }
    writeUInt8(i) {
      this.offset = writeUInt8(this.buffer, this.offset, i);
    }
    writeInt32(i) {
      this.offset = writeInt32(this.buffer, this.offset, i, "LE");
    }
    writeInt64(i) {
      this.offset = writeInt64(this.buffer, this.offset, BigInt(i), "LE");
    }
    writeUInt32(i) {
      this.offset = writeUInt32(this.buffer, this.offset, i, "LE");
    }
    writeUInt64(i) {
      this.offset = writeUInt64(this.buffer, this.offset, BigInt(i), "LE");
    }
    writeVarInt(i) {
      const { bytes } = encode5(i, this.buffer, this.offset);
      this.offset += bytes;
    }
    writeSlice(slice) {
      if (this.buffer.length < this.offset + slice.length) {
        throw new Error("Cannot write slice out of bounds");
      }
      this.buffer.set(slice, this.offset);
      this.offset += slice.length;
    }
    writeVarSlice(slice) {
      this.writeVarInt(slice.length);
      this.writeSlice(slice);
    }
    writeVector(vector) {
      this.writeVarInt(vector.length);
      vector.forEach((buf) => this.writeVarSlice(buf));
    }
    end() {
      if (this.buffer.length === this.offset) {
        return this.buffer;
      }
      throw new Error(`buffer size ${this.buffer.length}, offset ${this.offset}`);
    }
  };
  var BufferReader = class {
    constructor(buffer, offset = 0) {
      __publicField(this, "buffer");
      __publicField(this, "offset");
      this.buffer = buffer;
      this.offset = offset;
      parse(tuple([BufferSchema, UInt32Schema]), [
        buffer,
        offset
      ]);
    }
    readUInt8() {
      const result = readUInt8(this.buffer, this.offset);
      this.offset++;
      return result;
    }
    readInt32() {
      const result = readInt32(this.buffer, this.offset, "LE");
      this.offset += 4;
      return result;
    }
    readUInt32() {
      const result = readUInt32(this.buffer, this.offset, "LE");
      this.offset += 4;
      return result;
    }
    readInt64() {
      const result = readInt64(this.buffer, this.offset, "LE");
      this.offset += 8;
      return result;
    }
    readVarInt() {
      const { bigintValue, bytes } = decode5(this.buffer, this.offset);
      this.offset += bytes;
      return bigintValue;
    }
    readSlice(n) {
      verifuint(n, MAX_JS_NUMBER);
      const num2 = Number(n);
      if (this.buffer.length < this.offset + num2) {
        throw new Error("Cannot read slice out of bounds");
      }
      const result = this.buffer.slice(this.offset, this.offset + num2);
      this.offset += num2;
      return result;
    }
    readVarSlice() {
      return this.readSlice(this.readVarInt());
    }
    readVector() {
      const count = this.readVarInt();
      const vector = [];
      for (let i = 0; i < count; i++) vector.push(this.readVarSlice());
      return vector;
    }
  };

  // node_modules/bitcoinjs-lib/src/esm/payments/bip341.js
  var LEAF_VERSION_TAPSCRIPT = 192;
  var MAX_TAPTREE_DEPTH = 128;
  var isHashBranch = (ht) => "left" in ht && "right" in ht;
  function rootHashFromPath(controlBlock, leafHash) {
    if (controlBlock.length < 33)
      throw new TypeError(
        `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`
      );
    const m = (controlBlock.length - 33) / 32;
    let kj = leafHash;
    for (let j = 0; j < m; j++) {
      const ej = controlBlock.slice(33 + 32 * j, 65 + 32 * j);
      if (compare(kj, ej) < 0) {
        kj = tapBranchHash(kj, ej);
      } else {
        kj = tapBranchHash(ej, kj);
      }
    }
    return kj;
  }
  function toHashTree(scriptTree) {
    if (isTapleaf(scriptTree)) return { hash: tapleafHash(scriptTree) };
    const hashes = [toHashTree(scriptTree[0]), toHashTree(scriptTree[1])];
    hashes.sort((a, b) => compare(a.hash, b.hash));
    const [left, right] = hashes;
    return {
      hash: tapBranchHash(left.hash, right.hash),
      left,
      right
    };
  }
  function findScriptPath(node, hash) {
    if (isHashBranch(node)) {
      const leftPath = findScriptPath(node.left, hash);
      if (leftPath !== void 0) return [...leftPath, node.right.hash];
      const rightPath = findScriptPath(node.right, hash);
      if (rightPath !== void 0) return [...rightPath, node.left.hash];
    } else if (compare(node.hash, hash) === 0) {
      return [];
    }
    return void 0;
  }
  function tapleafHash(leaf) {
    const version = leaf.version || LEAF_VERSION_TAPSCRIPT;
    return taggedHash(
      "TapLeaf",
      concat([Uint8Array.from([version]), serializeScript(leaf.output)])
    );
  }
  function tapTweakHash(pubKey, h2) {
    return taggedHash(
      "TapTweak",
      concat(h2 ? [pubKey, h2] : [pubKey])
    );
  }
  function tweakKey(pubKey, h2) {
    if (!(pubKey instanceof Uint8Array)) return null;
    if (pubKey.length !== 32) return null;
    if (h2 && h2.length !== 32) return null;
    const tweakHash = tapTweakHash(pubKey, h2);
    const res = getEccLib().xOnlyPointAddTweak(pubKey, tweakHash);
    if (!res || res.xOnlyPubkey === null) return null;
    return {
      parity: res.parity,
      x: Uint8Array.from(res.xOnlyPubkey)
    };
  }
  function tapBranchHash(a, b) {
    return taggedHash("TapBranch", concat([a, b]));
  }
  function serializeScript(s) {
    const varintLen = esm_exports.encodingLength(s.length);
    const buffer = new Uint8Array(varintLen);
    esm_exports.encode(s.length, buffer);
    return concat([buffer, s]);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2tr.js
  var import_bech323 = __toESM(require_dist(), 1);
  var OPS8 = OPS;
  var TAPROOT_WITNESS_VERSION = 1;
  var ANNEX_PREFIX = 80;
  function p2tr(a, opts) {
    if (!a.address && !a.output && !a.pubkey && !a.internalPubkey && !(a.witness && a.witness.length > 1))
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          address: string(),
          input: NBufferSchemaFactory(0),
          network: object({}),
          output: NBufferSchemaFactory(34),
          internalPubkey: NBufferSchemaFactory(32),
          hash: NBufferSchemaFactory(32),
          // merkle root hash, the tweak
          pubkey: NBufferSchemaFactory(32),
          // tweaked with `hash` from `internalPubkey`
          signature: union([
            NBufferSchemaFactory(64),
            NBufferSchemaFactory(65)
          ]),
          witness: array(BufferSchema),
          scriptTree: custom(isTaptree, "Taptree is not of type isTaptree"),
          redeem: partial(
            object({
              output: BufferSchema,
              // tapleaf script
              redeemVersion: number(),
              // tapleaf version
              witness: array(BufferSchema)
            })
          ),
          redeemVersion: number()
        })
      ),
      a
    );
    const _address = value(() => {
      return fromBech32(a.address);
    });
    const _witness = value(() => {
      if (!a.witness || !a.witness.length) return;
      if (a.witness.length >= 2 && a.witness[a.witness.length - 1][0] === ANNEX_PREFIX) {
        return a.witness.slice(0, -1);
      }
      return a.witness.slice();
    });
    const _hashTree = value(() => {
      if (a.scriptTree) return toHashTree(a.scriptTree);
      if (a.hash) return { hash: a.hash };
      return;
    });
    const network = a.network || bitcoin;
    const o = { name: "p2tr", network };
    prop(o, "address", () => {
      if (!o.pubkey) return;
      const words = import_bech323.bech32m.toWords(o.pubkey);
      words.unshift(TAPROOT_WITNESS_VERSION);
      return import_bech323.bech32m.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      const hashTree = _hashTree();
      if (hashTree) return hashTree.hash;
      const w = _witness();
      if (w && w.length > 1) {
        const controlBlock = w[w.length - 1];
        const leafVersion = controlBlock[0] & TAPLEAF_VERSION_MASK;
        const script = w[w.length - 2];
        const leafHash = tapleafHash({ output: script, version: leafVersion });
        return rootHashFromPath(controlBlock, leafHash);
      }
      return null;
    });
    prop(o, "output", () => {
      if (!o.pubkey) return;
      return compile([OPS8.OP_1, o.pubkey]);
    });
    prop(o, "redeemVersion", () => {
      if (a.redeemVersion) return a.redeemVersion;
      if (a.redeem && a.redeem.redeemVersion !== void 0 && a.redeem.redeemVersion !== null) {
        return a.redeem.redeemVersion;
      }
      return LEAF_VERSION_TAPSCRIPT;
    });
    prop(o, "redeem", () => {
      const witness = _witness();
      if (!witness || witness.length < 2) return;
      return {
        output: witness[witness.length - 2],
        witness: witness.slice(0, -2),
        redeemVersion: witness[witness.length - 1][0] & TAPLEAF_VERSION_MASK
      };
    });
    prop(o, "pubkey", () => {
      if (a.pubkey) return a.pubkey;
      if (a.output) return a.output.slice(2);
      if (a.address) return _address().data;
      if (o.internalPubkey) {
        const tweakedKey = tweakKey(o.internalPubkey, o.hash);
        if (tweakedKey) return tweakedKey.x;
      }
    });
    prop(o, "internalPubkey", () => {
      if (a.internalPubkey) return a.internalPubkey;
      const witness = _witness();
      if (witness && witness.length > 1)
        return witness[witness.length - 1].slice(1, 33);
    });
    prop(o, "signature", () => {
      if (a.signature) return a.signature;
      const witness = _witness();
      if (!witness || witness.length !== 1) return;
      return witness[0];
    });
    prop(o, "witness", () => {
      if (a.witness) return a.witness;
      const hashTree = _hashTree();
      if (hashTree && a.redeem && a.redeem.output && a.internalPubkey) {
        const leafHash = tapleafHash({
          output: a.redeem.output,
          version: o.redeemVersion
        });
        const path = findScriptPath(hashTree, leafHash);
        if (!path) return;
        const outputKey = tweakKey(a.internalPubkey, hashTree.hash);
        if (!outputKey) return;
        const controlBock = concat(
          [
            Uint8Array.from([o.redeemVersion | outputKey.parity]),
            a.internalPubkey
          ].concat(path)
        );
        return [a.redeem.output, controlBock];
      }
      if (a.signature) return [a.signature];
    });
    if (opts.validate) {
      let pubkey = Uint8Array.from([]);
      if (a.address) {
        if (network && network.bech32 !== _address().prefix)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== TAPROOT_WITNESS_VERSION)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 32)
          throw new TypeError("Invalid address data");
        pubkey = _address().data;
      }
      if (a.pubkey) {
        if (pubkey.length > 0 && compare(pubkey, a.pubkey) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = a.pubkey;
      }
      if (a.output) {
        if (a.output.length !== 34 || a.output[0] !== OPS8.OP_1 || a.output[1] !== 32)
          throw new TypeError("Output is invalid");
        if (pubkey.length > 0 && compare(pubkey, a.output.slice(2)) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = a.output.slice(2);
      }
      if (a.internalPubkey) {
        const tweakedKey = tweakKey(a.internalPubkey, o.hash);
        if (pubkey.length > 0 && compare(pubkey, tweakedKey.x) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = tweakedKey.x;
      }
      if (pubkey && pubkey.length) {
        if (!getEccLib().isXOnlyPoint(pubkey))
          throw new TypeError("Invalid pubkey for p2tr");
      }
      const hashTree = _hashTree();
      if (a.hash && hashTree) {
        if (compare(a.hash, hashTree.hash) !== 0)
          throw new TypeError("Hash mismatch");
      }
      if (a.redeem && a.redeem.output && hashTree) {
        const leafHash = tapleafHash({
          output: a.redeem.output,
          version: o.redeemVersion
        });
        if (!findScriptPath(hashTree, leafHash))
          throw new TypeError("Redeem script not in tree");
      }
      const witness = _witness();
      if (a.redeem && o.redeem) {
        if (a.redeem.redeemVersion) {
          if (a.redeem.redeemVersion !== o.redeem.redeemVersion)
            throw new TypeError("Redeem.redeemVersion and witness mismatch");
        }
        if (a.redeem.output) {
          if (decompile(a.redeem.output).length === 0)
            throw new TypeError("Redeem.output is invalid");
          if (o.redeem.output && compare(a.redeem.output, o.redeem.output) !== 0)
            throw new TypeError("Redeem.output and witness mismatch");
        }
        if (a.redeem.witness) {
          if (o.redeem.witness && !stacksEqual(a.redeem.witness, o.redeem.witness))
            throw new TypeError("Redeem.witness and witness mismatch");
        }
      }
      if (witness && witness.length) {
        if (witness.length === 1) {
          if (a.signature && compare(a.signature, witness[0]) !== 0)
            throw new TypeError("Signature mismatch");
        } else {
          const controlBlock = witness[witness.length - 1];
          if (controlBlock.length < 33)
            throw new TypeError(
              `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`
            );
          if ((controlBlock.length - 33) % 32 !== 0)
            throw new TypeError(
              `The control-block length of ${controlBlock.length} is incorrect!`
            );
          const m = (controlBlock.length - 33) / 32;
          if (m > 128)
            throw new TypeError(
              `The script path is too long. Got ${m}, expected max 128.`
            );
          const internalPubkey = controlBlock.slice(1, 33);
          if (a.internalPubkey && compare(a.internalPubkey, internalPubkey) !== 0)
            throw new TypeError("Internal pubkey mismatch");
          if (!getEccLib().isXOnlyPoint(internalPubkey))
            throw new TypeError("Invalid internalPubkey for p2tr witness");
          const leafVersion = controlBlock[0] & TAPLEAF_VERSION_MASK;
          const script = witness[witness.length - 2];
          const leafHash = tapleafHash({ output: script, version: leafVersion });
          const hash = rootHashFromPath(controlBlock, leafHash);
          const outputKey = tweakKey(internalPubkey, hash);
          if (!outputKey)
            throw new TypeError("Invalid outputKey for p2tr witness");
          if (pubkey.length && compare(pubkey, outputKey.x) !== 0)
            throw new TypeError("Pubkey mismatch for p2tr witness");
          if (outputKey.parity !== (controlBlock[0] & 1))
            throw new Error("Incorrect parity");
        }
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/address.js
  var import_bech324 = __toESM(require_dist(), 1);
  var FUTURE_SEGWIT_MAX_SIZE = 40;
  var FUTURE_SEGWIT_MIN_SIZE = 2;
  var FUTURE_SEGWIT_MAX_VERSION = 16;
  var FUTURE_SEGWIT_MIN_VERSION = 2;
  var FUTURE_SEGWIT_VERSION_DIFF = 80;
  var FUTURE_SEGWIT_VERSION_WARNING = "WARNING: Sending to a future segwit version address can lead to loss of funds. End users MUST be warned carefully in the GUI and asked if they wish to proceed with caution. Wallets should verify the segwit version from the output of fromBech32, then decide when it is safe to use which version of segwit.";
  var WARNING_STATES = [false, false];
  function _toFutureSegwitAddress(output, network) {
    const data = output.slice(2);
    if (data.length < FUTURE_SEGWIT_MIN_SIZE || data.length > FUTURE_SEGWIT_MAX_SIZE)
      throw new TypeError("Invalid program length for segwit address");
    const version = output[0] - FUTURE_SEGWIT_VERSION_DIFF;
    if (version < FUTURE_SEGWIT_MIN_VERSION || version > FUTURE_SEGWIT_MAX_VERSION)
      throw new TypeError("Invalid version for segwit address");
    if (output[1] !== data.length)
      throw new TypeError("Invalid script for segwit address");
    if (WARNING_STATES[0] === false) {
      console.warn(FUTURE_SEGWIT_VERSION_WARNING);
      WARNING_STATES[0] = true;
    }
    return toBech32(data, version, network.bech32);
  }
  function fromBase58Check(address) {
    const payload = esm_default3.decode(address);
    if (payload.length < 21) throw new TypeError(address + " is too short");
    if (payload.length > 21) throw new TypeError(address + " is too long");
    const version = readUInt8(payload, 0);
    const hash = payload.slice(1);
    return { version, hash };
  }
  function fromBech32(address) {
    let result;
    let version;
    try {
      result = import_bech324.bech32.decode(address);
    } catch (e) {
    }
    if (result) {
      version = result.words[0];
      if (version !== 0) throw new TypeError(address + " uses wrong encoding");
    } else {
      result = import_bech324.bech32m.decode(address);
      version = result.words[0];
      if (version === 0) throw new TypeError(address + " uses wrong encoding");
    }
    const data = import_bech324.bech32.fromWords(result.words.slice(1));
    return {
      version,
      prefix: result.prefix,
      data: Uint8Array.from(data)
    };
  }
  function toBech32(data, version, prefix) {
    const words = import_bech324.bech32.toWords(data);
    words.unshift(version);
    return version === 0 ? import_bech324.bech32.encode(prefix, words) : import_bech324.bech32m.encode(prefix, words);
  }
  function fromOutputScript(output, network) {
    network = network || bitcoin;
    try {
      return p2pkh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2sh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2wpkh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2wsh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2tr({ output, network }).address;
    } catch (e) {
    }
    try {
      return _toFutureSegwitAddress(output, network);
    } catch (e) {
    }
    throw new Error(toASM(output) + " has no matching Address");
  }
  function toOutputScript(address, network) {
    network = network || bitcoin;
    let decodeBase58;
    let decodeBech32;
    try {
      decodeBase58 = fromBase58Check(address);
    } catch (e) {
    }
    if (decodeBase58) {
      if (decodeBase58.version === network.pubKeyHash)
        return p2pkh({ hash: decodeBase58.hash }).output;
      if (decodeBase58.version === network.scriptHash)
        return p2sh({ hash: decodeBase58.hash }).output;
    } else {
      try {
        decodeBech32 = fromBech32(address);
      } catch (e) {
      }
      if (decodeBech32) {
        if (decodeBech32.prefix !== network.bech32)
          throw new Error(address + " has an invalid prefix");
        if (decodeBech32.version === 0) {
          if (decodeBech32.data.length === 20)
            return p2wpkh({ hash: decodeBech32.data }).output;
          if (decodeBech32.data.length === 32)
            return p2wsh({ hash: decodeBech32.data }).output;
        } else if (decodeBech32.version === 1) {
          if (decodeBech32.data.length === 32)
            return p2tr({ pubkey: decodeBech32.data }).output;
        } else if (decodeBech32.version >= FUTURE_SEGWIT_MIN_VERSION && decodeBech32.version <= FUTURE_SEGWIT_MAX_VERSION && decodeBech32.data.length >= FUTURE_SEGWIT_MIN_SIZE && decodeBech32.data.length <= FUTURE_SEGWIT_MAX_SIZE) {
          if (WARNING_STATES[1] === false) {
            console.warn(FUTURE_SEGWIT_VERSION_WARNING);
            WARNING_STATES[1] = true;
          }
          return compile([
            decodeBech32.version + FUTURE_SEGWIT_VERSION_DIFF,
            decodeBech32.data
          ]);
        }
      }
    }
    throw new Error(address + " has no matching Script");
  }

  // node_modules/bitcoinjs-lib/src/esm/transaction.js
  function varSliceSize(someScript) {
    const length2 = someScript.length;
    return esm_exports.encodingLength(length2) + length2;
  }
  function vectorSize(someVector) {
    const length2 = someVector.length;
    return esm_exports.encodingLength(length2) + someVector.reduce((sum, witness) => {
      return sum + varSliceSize(witness);
    }, 0);
  }
  var EMPTY_BUFFER3 = new Uint8Array(0);
  var EMPTY_WITNESS = [];
  var ZERO2 = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000000"
  );
  var ONE = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000001"
  );
  var VALUE_UINT64_MAX = fromHex("ffffffffffffffff");
  var BLANK_OUTPUT = {
    script: EMPTY_BUFFER3,
    valueBuffer: VALUE_UINT64_MAX
  };
  function isOutput(out) {
    return out.value !== void 0;
  }
  var _Transaction = class _Transaction {
    constructor() {
      __publicField(this, "version", 1);
      __publicField(this, "locktime", 0);
      __publicField(this, "ins", []);
      __publicField(this, "outs", []);
    }
    static fromBuffer(buffer, _NO_STRICT) {
      const bufferReader = new BufferReader(buffer);
      const tx = new _Transaction();
      tx.version = bufferReader.readUInt32();
      const marker = bufferReader.readUInt8();
      const flag = bufferReader.readUInt8();
      let hasWitnesses = false;
      if (marker === _Transaction.ADVANCED_TRANSACTION_MARKER && flag === _Transaction.ADVANCED_TRANSACTION_FLAG) {
        hasWitnesses = true;
      } else {
        bufferReader.offset -= 2;
      }
      const vinLen = bufferReader.readVarInt();
      for (let i = 0; i < vinLen; ++i) {
        tx.ins.push({
          hash: bufferReader.readSlice(32),
          index: bufferReader.readUInt32(),
          script: bufferReader.readVarSlice(),
          sequence: bufferReader.readUInt32(),
          witness: EMPTY_WITNESS
        });
      }
      const voutLen = bufferReader.readVarInt();
      for (let i = 0; i < voutLen; ++i) {
        tx.outs.push({
          value: bufferReader.readInt64(),
          script: bufferReader.readVarSlice()
        });
      }
      if (hasWitnesses) {
        for (let i = 0; i < vinLen; ++i) {
          tx.ins[i].witness = bufferReader.readVector();
        }
        if (!tx.hasWitnesses())
          throw new Error("Transaction has superfluous witness data");
      }
      tx.locktime = bufferReader.readUInt32();
      if (_NO_STRICT) return tx;
      if (bufferReader.offset !== buffer.length)
        throw new Error("Transaction has unexpected data");
      return tx;
    }
    static fromHex(hex) {
      return _Transaction.fromBuffer(fromHex(hex), false);
    }
    static isCoinbaseHash(buffer) {
      parse(Hash256bitSchema, buffer);
      for (let i = 0; i < 32; ++i) {
        if (buffer[i] !== 0) return false;
      }
      return true;
    }
    isCoinbase() {
      return this.ins.length === 1 && _Transaction.isCoinbaseHash(this.ins[0].hash);
    }
    addInput(hash, index, sequence, scriptSig) {
      parse(
        tuple([
          Hash256bitSchema,
          UInt32Schema,
          nullable(optional(UInt32Schema)),
          nullable(optional(BufferSchema))
        ]),
        [hash, index, sequence, scriptSig]
      );
      if (sequence === void 0 || sequence === null) {
        sequence = _Transaction.DEFAULT_SEQUENCE;
      }
      return this.ins.push({
        hash,
        index,
        script: scriptSig || EMPTY_BUFFER3,
        sequence,
        witness: EMPTY_WITNESS
      }) - 1;
    }
    addOutput(scriptPubKey, value2) {
      parse(tuple([BufferSchema, SatoshiSchema]), [
        scriptPubKey,
        value2
      ]);
      return this.outs.push({
        script: scriptPubKey,
        value: value2
      }) - 1;
    }
    hasWitnesses() {
      return this.ins.some((x) => {
        return x.witness.length !== 0;
      });
    }
    stripWitnesses() {
      this.ins.forEach((input) => {
        input.witness = EMPTY_WITNESS;
      });
    }
    weight() {
      const base2 = this.byteLength(false);
      const total = this.byteLength(true);
      return base2 * 3 + total;
    }
    virtualSize() {
      return Math.ceil(this.weight() / 4);
    }
    byteLength(_ALLOW_WITNESS = true) {
      const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
      return (hasWitnesses ? 10 : 8) + esm_exports.encodingLength(this.ins.length) + esm_exports.encodingLength(this.outs.length) + this.ins.reduce((sum, input) => {
        return sum + 40 + varSliceSize(input.script);
      }, 0) + this.outs.reduce((sum, output) => {
        return sum + 8 + varSliceSize(output.script);
      }, 0) + (hasWitnesses ? this.ins.reduce((sum, input) => {
        return sum + vectorSize(input.witness);
      }, 0) : 0);
    }
    clone() {
      const newTx = new _Transaction();
      newTx.version = this.version;
      newTx.locktime = this.locktime;
      newTx.ins = this.ins.map((txIn) => {
        return {
          hash: txIn.hash,
          index: txIn.index,
          script: txIn.script,
          sequence: txIn.sequence,
          witness: txIn.witness
        };
      });
      newTx.outs = this.outs.map((txOut) => {
        return {
          script: txOut.script,
          value: txOut.value
        };
      });
      return newTx;
    }
    /**
     * Hash transaction for signing a specific input.
     *
     * Bitcoin uses a different hash for each signed transaction input.
     * This method copies the transaction, makes the necessary changes based on the
     * hashType, and then hashes the result.
     * This hash can then be used to sign the provided transaction input.
     */
    hashForSignature(inIndex, prevOutScript, hashType) {
      parse(tuple([UInt32Schema, BufferSchema, number()]), [
        inIndex,
        prevOutScript,
        hashType
      ]);
      if (inIndex >= this.ins.length) return ONE;
      const ourScript = compile(
        decompile(prevOutScript).filter((x) => {
          return x !== OPS.OP_CODESEPARATOR;
        })
      );
      const txTmp = this.clone();
      if ((hashType & 31) === _Transaction.SIGHASH_NONE) {
        txTmp.outs = [];
        txTmp.ins.forEach((input, i) => {
          if (i === inIndex) return;
          input.sequence = 0;
        });
      } else if ((hashType & 31) === _Transaction.SIGHASH_SINGLE) {
        if (inIndex >= this.outs.length) return ONE;
        txTmp.outs.length = inIndex + 1;
        for (let i = 0; i < inIndex; i++) {
          txTmp.outs[i] = BLANK_OUTPUT;
        }
        txTmp.ins.forEach((input, y) => {
          if (y === inIndex) return;
          input.sequence = 0;
        });
      }
      if (hashType & _Transaction.SIGHASH_ANYONECANPAY) {
        txTmp.ins = [txTmp.ins[inIndex]];
        txTmp.ins[0].script = ourScript;
      } else {
        txTmp.ins.forEach((input) => {
          input.script = EMPTY_BUFFER3;
        });
        txTmp.ins[inIndex].script = ourScript;
      }
      const buffer = new Uint8Array(txTmp.byteLength(false) + 4);
      writeInt32(buffer, buffer.length - 4, hashType, "LE");
      txTmp.__toBuffer(buffer, 0, false);
      return hash256(buffer);
    }
    hashForWitnessV1(inIndex, prevOutScripts, values, hashType, leafHash, annex) {
      parse(
        tuple([
          UInt32Schema,
          array(BufferSchema),
          array(SatoshiSchema),
          UInt32Schema
        ]),
        [inIndex, prevOutScripts, values, hashType]
      );
      if (values.length !== this.ins.length || prevOutScripts.length !== this.ins.length) {
        throw new Error("Must supply prevout script and value for all inputs");
      }
      const outputType = hashType === _Transaction.SIGHASH_DEFAULT ? _Transaction.SIGHASH_ALL : hashType & _Transaction.SIGHASH_OUTPUT_MASK;
      const inputType = hashType & _Transaction.SIGHASH_INPUT_MASK;
      const isAnyoneCanPay = inputType === _Transaction.SIGHASH_ANYONECANPAY;
      const isNone = outputType === _Transaction.SIGHASH_NONE;
      const isSingle = outputType === _Transaction.SIGHASH_SINGLE;
      let hashPrevouts = EMPTY_BUFFER3;
      let hashAmounts = EMPTY_BUFFER3;
      let hashScriptPubKeys = EMPTY_BUFFER3;
      let hashSequences = EMPTY_BUFFER3;
      let hashOutputs = EMPTY_BUFFER3;
      if (!isAnyoneCanPay) {
        let bufferWriter = BufferWriter.withCapacity(36 * this.ins.length);
        this.ins.forEach((txIn) => {
          bufferWriter.writeSlice(txIn.hash);
          bufferWriter.writeUInt32(txIn.index);
        });
        hashPrevouts = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(8 * this.ins.length);
        values.forEach((value2) => bufferWriter.writeInt64(value2));
        hashAmounts = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(
          prevOutScripts.map(varSliceSize).reduce((a, b) => a + b)
        );
        prevOutScripts.forEach(
          (prevOutScript) => bufferWriter.writeVarSlice(prevOutScript)
        );
        hashScriptPubKeys = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(4 * this.ins.length);
        this.ins.forEach((txIn) => bufferWriter.writeUInt32(txIn.sequence));
        hashSequences = sha2562(bufferWriter.end());
      }
      if (!(isNone || isSingle)) {
        if (!this.outs.length)
          throw new Error("Add outputs to the transaction before signing.");
        const txOutsSize = this.outs.map((output) => 8 + varSliceSize(output.script)).reduce((a, b) => a + b);
        const bufferWriter = BufferWriter.withCapacity(txOutsSize);
        this.outs.forEach((out) => {
          bufferWriter.writeInt64(out.value);
          bufferWriter.writeVarSlice(out.script);
        });
        hashOutputs = sha2562(bufferWriter.end());
      } else if (isSingle && inIndex < this.outs.length) {
        const output = this.outs[inIndex];
        const bufferWriter = BufferWriter.withCapacity(
          8 + varSliceSize(output.script)
        );
        bufferWriter.writeInt64(output.value);
        bufferWriter.writeVarSlice(output.script);
        hashOutputs = sha2562(bufferWriter.end());
      }
      const spendType = (leafHash ? 2 : 0) + (annex ? 1 : 0);
      const sigMsgSize = 174 - (isAnyoneCanPay ? 49 : 0) - (isNone ? 32 : 0) + (annex ? 32 : 0) + (leafHash ? 37 : 0);
      const sigMsgWriter = BufferWriter.withCapacity(sigMsgSize);
      sigMsgWriter.writeUInt8(hashType);
      sigMsgWriter.writeUInt32(this.version);
      sigMsgWriter.writeUInt32(this.locktime);
      sigMsgWriter.writeSlice(hashPrevouts);
      sigMsgWriter.writeSlice(hashAmounts);
      sigMsgWriter.writeSlice(hashScriptPubKeys);
      sigMsgWriter.writeSlice(hashSequences);
      if (!(isNone || isSingle)) {
        sigMsgWriter.writeSlice(hashOutputs);
      }
      sigMsgWriter.writeUInt8(spendType);
      if (isAnyoneCanPay) {
        const input = this.ins[inIndex];
        sigMsgWriter.writeSlice(input.hash);
        sigMsgWriter.writeUInt32(input.index);
        sigMsgWriter.writeInt64(values[inIndex]);
        sigMsgWriter.writeVarSlice(prevOutScripts[inIndex]);
        sigMsgWriter.writeUInt32(input.sequence);
      } else {
        sigMsgWriter.writeUInt32(inIndex);
      }
      if (annex) {
        const bufferWriter = BufferWriter.withCapacity(varSliceSize(annex));
        bufferWriter.writeVarSlice(annex);
        sigMsgWriter.writeSlice(sha2562(bufferWriter.end()));
      }
      if (isSingle) {
        sigMsgWriter.writeSlice(hashOutputs);
      }
      if (leafHash) {
        sigMsgWriter.writeSlice(leafHash);
        sigMsgWriter.writeUInt8(0);
        sigMsgWriter.writeUInt32(4294967295);
      }
      return taggedHash(
        "TapSighash",
        concat([Uint8Array.from([0]), sigMsgWriter.end()])
      );
    }
    hashForWitnessV0(inIndex, prevOutScript, value2, hashType) {
      parse(
        tuple([
          UInt32Schema,
          BufferSchema,
          SatoshiSchema,
          UInt32Schema
        ]),
        [inIndex, prevOutScript, value2, hashType]
      );
      let tbuffer = Uint8Array.from([]);
      let bufferWriter;
      let hashOutputs = ZERO2;
      let hashPrevouts = ZERO2;
      let hashSequence = ZERO2;
      if (!(hashType & _Transaction.SIGHASH_ANYONECANPAY)) {
        tbuffer = new Uint8Array(36 * this.ins.length);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.ins.forEach((txIn) => {
          bufferWriter.writeSlice(txIn.hash);
          bufferWriter.writeUInt32(txIn.index);
        });
        hashPrevouts = hash256(tbuffer);
      }
      if (!(hashType & _Transaction.SIGHASH_ANYONECANPAY) && (hashType & 31) !== _Transaction.SIGHASH_SINGLE && (hashType & 31) !== _Transaction.SIGHASH_NONE) {
        tbuffer = new Uint8Array(4 * this.ins.length);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.ins.forEach((txIn) => {
          bufferWriter.writeUInt32(txIn.sequence);
        });
        hashSequence = hash256(tbuffer);
      }
      if ((hashType & 31) !== _Transaction.SIGHASH_SINGLE && (hashType & 31) !== _Transaction.SIGHASH_NONE) {
        const txOutsSize = this.outs.reduce((sum, output) => {
          return sum + 8 + varSliceSize(output.script);
        }, 0);
        tbuffer = new Uint8Array(txOutsSize);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.outs.forEach((out) => {
          bufferWriter.writeInt64(out.value);
          bufferWriter.writeVarSlice(out.script);
        });
        hashOutputs = hash256(tbuffer);
      } else if ((hashType & 31) === _Transaction.SIGHASH_SINGLE && inIndex < this.outs.length) {
        const output = this.outs[inIndex];
        tbuffer = new Uint8Array(8 + varSliceSize(output.script));
        bufferWriter = new BufferWriter(tbuffer, 0);
        bufferWriter.writeInt64(output.value);
        bufferWriter.writeVarSlice(output.script);
        hashOutputs = hash256(tbuffer);
      }
      tbuffer = new Uint8Array(156 + varSliceSize(prevOutScript));
      bufferWriter = new BufferWriter(tbuffer, 0);
      const input = this.ins[inIndex];
      bufferWriter.writeUInt32(this.version);
      bufferWriter.writeSlice(hashPrevouts);
      bufferWriter.writeSlice(hashSequence);
      bufferWriter.writeSlice(input.hash);
      bufferWriter.writeUInt32(input.index);
      bufferWriter.writeVarSlice(prevOutScript);
      bufferWriter.writeInt64(value2);
      bufferWriter.writeUInt32(input.sequence);
      bufferWriter.writeSlice(hashOutputs);
      bufferWriter.writeUInt32(this.locktime);
      bufferWriter.writeUInt32(hashType);
      return hash256(tbuffer);
    }
    getHash(forWitness) {
      if (forWitness && this.isCoinbase()) return new Uint8Array(32);
      return hash256(this.__toBuffer(void 0, void 0, forWitness));
    }
    getId() {
      return toHex(reverseBuffer(this.getHash(false)));
    }
    toBuffer(buffer, initialOffset) {
      return this.__toBuffer(buffer, initialOffset, true);
    }
    toHex() {
      return toHex(this.toBuffer(void 0, void 0));
    }
    setInputScript(index, scriptSig) {
      parse(tuple([number(), BufferSchema]), [index, scriptSig]);
      this.ins[index].script = scriptSig;
    }
    setWitness(index, witness) {
      parse(tuple([number(), array(BufferSchema)]), [
        index,
        witness
      ]);
      this.ins[index].witness = witness;
    }
    __toBuffer(buffer, initialOffset, _ALLOW_WITNESS = false) {
      if (!buffer) buffer = new Uint8Array(this.byteLength(_ALLOW_WITNESS));
      const bufferWriter = new BufferWriter(buffer, initialOffset || 0);
      bufferWriter.writeUInt32(this.version);
      const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
      if (hasWitnesses) {
        bufferWriter.writeUInt8(_Transaction.ADVANCED_TRANSACTION_MARKER);
        bufferWriter.writeUInt8(_Transaction.ADVANCED_TRANSACTION_FLAG);
      }
      bufferWriter.writeVarInt(this.ins.length);
      this.ins.forEach((txIn) => {
        bufferWriter.writeSlice(txIn.hash);
        bufferWriter.writeUInt32(txIn.index);
        bufferWriter.writeVarSlice(txIn.script);
        bufferWriter.writeUInt32(txIn.sequence);
      });
      bufferWriter.writeVarInt(this.outs.length);
      this.outs.forEach((txOut) => {
        if (isOutput(txOut)) {
          bufferWriter.writeInt64(txOut.value);
        } else {
          bufferWriter.writeSlice(txOut.valueBuffer);
        }
        bufferWriter.writeVarSlice(txOut.script);
      });
      if (hasWitnesses) {
        this.ins.forEach((input) => {
          bufferWriter.writeVector(input.witness);
        });
      }
      bufferWriter.writeUInt32(this.locktime);
      if (initialOffset !== void 0)
        return buffer.slice(initialOffset, bufferWriter.offset);
      return buffer;
    }
  };
  __publicField(_Transaction, "DEFAULT_SEQUENCE", 4294967295);
  __publicField(_Transaction, "SIGHASH_DEFAULT", 0);
  __publicField(_Transaction, "SIGHASH_ALL", 1);
  __publicField(_Transaction, "SIGHASH_NONE", 2);
  __publicField(_Transaction, "SIGHASH_SINGLE", 3);
  __publicField(_Transaction, "SIGHASH_ANYONECANPAY", 128);
  __publicField(_Transaction, "SIGHASH_OUTPUT_MASK", 3);
  __publicField(_Transaction, "SIGHASH_INPUT_MASK", 128);
  __publicField(_Transaction, "ADVANCED_TRANSACTION_MARKER", 0);
  __publicField(_Transaction, "ADVANCED_TRANSACTION_FLAG", 1);
  var Transaction = _Transaction;

  // node_modules/bitcoinjs-lib/src/esm/block.js
  var errorMerkleNoTxes = new TypeError(
    "Cannot compute merkle root for zero transactions"
  );
  var errorWitnessNotSegwit = new TypeError(
    "Cannot compute witness commit for non-segwit block"
  );

  // node_modules/bip174/src/esm/lib/converter/index.js
  var converter_exports = {};
  __export(converter_exports, {
    globals: () => globals,
    inputs: () => inputs,
    outputs: () => outputs
  });

  // node_modules/bip174/src/esm/lib/typeFields.js
  var GlobalTypes;
  (function(GlobalTypes2) {
    GlobalTypes2[GlobalTypes2["UNSIGNED_TX"] = 0] = "UNSIGNED_TX";
    GlobalTypes2[GlobalTypes2["GLOBAL_XPUB"] = 1] = "GLOBAL_XPUB";
  })(GlobalTypes || (GlobalTypes = {}));
  var InputTypes;
  (function(InputTypes2) {
    InputTypes2[InputTypes2["NON_WITNESS_UTXO"] = 0] = "NON_WITNESS_UTXO";
    InputTypes2[InputTypes2["WITNESS_UTXO"] = 1] = "WITNESS_UTXO";
    InputTypes2[InputTypes2["PARTIAL_SIG"] = 2] = "PARTIAL_SIG";
    InputTypes2[InputTypes2["SIGHASH_TYPE"] = 3] = "SIGHASH_TYPE";
    InputTypes2[InputTypes2["REDEEM_SCRIPT"] = 4] = "REDEEM_SCRIPT";
    InputTypes2[InputTypes2["WITNESS_SCRIPT"] = 5] = "WITNESS_SCRIPT";
    InputTypes2[InputTypes2["BIP32_DERIVATION"] = 6] = "BIP32_DERIVATION";
    InputTypes2[InputTypes2["FINAL_SCRIPTSIG"] = 7] = "FINAL_SCRIPTSIG";
    InputTypes2[InputTypes2["FINAL_SCRIPTWITNESS"] = 8] = "FINAL_SCRIPTWITNESS";
    InputTypes2[InputTypes2["POR_COMMITMENT"] = 9] = "POR_COMMITMENT";
    InputTypes2[InputTypes2["TAP_KEY_SIG"] = 19] = "TAP_KEY_SIG";
    InputTypes2[InputTypes2["TAP_SCRIPT_SIG"] = 20] = "TAP_SCRIPT_SIG";
    InputTypes2[InputTypes2["TAP_LEAF_SCRIPT"] = 21] = "TAP_LEAF_SCRIPT";
    InputTypes2[InputTypes2["TAP_BIP32_DERIVATION"] = 22] = "TAP_BIP32_DERIVATION";
    InputTypes2[InputTypes2["TAP_INTERNAL_KEY"] = 23] = "TAP_INTERNAL_KEY";
    InputTypes2[InputTypes2["TAP_MERKLE_ROOT"] = 24] = "TAP_MERKLE_ROOT";
  })(InputTypes || (InputTypes = {}));
  var OutputTypes;
  (function(OutputTypes2) {
    OutputTypes2[OutputTypes2["REDEEM_SCRIPT"] = 0] = "REDEEM_SCRIPT";
    OutputTypes2[OutputTypes2["WITNESS_SCRIPT"] = 1] = "WITNESS_SCRIPT";
    OutputTypes2[OutputTypes2["BIP32_DERIVATION"] = 2] = "BIP32_DERIVATION";
    OutputTypes2[OutputTypes2["TAP_INTERNAL_KEY"] = 5] = "TAP_INTERNAL_KEY";
    OutputTypes2[OutputTypes2["TAP_TREE"] = 6] = "TAP_TREE";
    OutputTypes2[OutputTypes2["TAP_BIP32_DERIVATION"] = 7] = "TAP_BIP32_DERIVATION";
  })(OutputTypes || (OutputTypes = {}));

  // node_modules/bip174/src/esm/lib/converter/global/globalXpub.js
  var globalXpub_exports = {};
  __export(globalXpub_exports, {
    canAddToArray: () => canAddToArray,
    check: () => check2,
    decode: () => decode6,
    encode: () => encode6,
    expected: () => expected
  });

  // node_modules/bip174/node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS3 = "0123456789abcdefABCDEF";
  var HEX_CODES3 = HEX_STRINGS3.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS3 = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS3.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER3 = new TextEncoder();
  var DECODER3 = new TextDecoder();
  function toUtf8(bytes) {
    return DECODER3.decode(bytes);
  }
  function fromUtf8(s) {
    return ENCODER3.encode(s);
  }
  function concat2(arrays) {
    const totalLength = arrays.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array2 of arrays) {
      result.set(array2, offset);
      offset += array2.length;
    }
    return result;
  }
  function toHex2(bytes) {
    const b = bytes || new Uint8Array();
    return b.length > 512 ? _toHexLengthPerf2(b) : _toHexIterPerf2(b);
  }
  function _toHexIterPerf2(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; ++i) {
      s += HEX_STRINGS3[HEX_CODEPOINTS3[HEX_CODES3[bytes[i] >> 4]]];
      s += HEX_STRINGS3[HEX_CODEPOINTS3[HEX_CODES3[bytes[i] & 15]]];
    }
    return s;
  }
  function _toHexLengthPerf2(bytes) {
    const hexBytes = new Uint8Array(bytes.length * 2);
    for (let i = 0; i < bytes.length; ++i) {
      hexBytes[i * 2] = HEX_CODES3[bytes[i] >> 4];
      hexBytes[i * 2 + 1] = HEX_CODES3[bytes[i] & 15];
    }
    return DECODER3.decode(hexBytes);
  }
  function fromHex2(hexString) {
    const hexBytes = ENCODER3.encode(hexString || "");
    const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
    let i;
    for (i = 0; i < resultBytes.length; i++) {
      const a = HEX_CODEPOINTS3[hexBytes[i * 2]];
      const b = HEX_CODEPOINTS3[hexBytes[i * 2 + 1]];
      if (a === void 0 || b === void 0) {
        break;
      }
      resultBytes[i] = a << 4 | b;
    }
    return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
  }
  function toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }
  function fromBase642(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function compare2(v1, v2) {
    const minLength = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLength; ++i) {
      if (v1[i] !== v2[i]) {
        return v1[i] < v2[i] ? -1 : 1;
      }
    }
    return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
  }
  function writeUInt323(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function readUInt82(buffer, offset) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    return buffer[offset];
  }
  function readUInt323(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      return num2;
    } else {
      let num2 = 0;
      num2 = (num2 << 8) + buffer[offset] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 1] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 2] >>> 0;
      num2 = (num2 << 8) + buffer[offset + 3] >>> 0;
      return num2;
    }
  }
  function writeInt642(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 0x7fffffffffffffffn || value2 < -0x8000000000000000n) {
      throw new Error(`The value of "value" is out of range. It must be >= ${-0x8000000000000000n} and <= ${0x7fffffffffffffffn}. Received ${value2}`);
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readInt642(buffer, offset, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    let num2 = 0n;
    if (littleEndian === "LE") {
      num2 = (num2 << 8n) + BigInt(buffer[offset + 7]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 6]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 5]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 4]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 3]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 2]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 1]);
      num2 = (num2 << 8n) + BigInt(buffer[offset]);
      return buffer[offset + 7] <= 127 ? num2 : num2 - 0x10000000000000000n;
    } else {
      let num3 = 0n;
      num3 = (num3 << 8n) + BigInt(buffer[offset]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 1]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 2]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 3]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 4]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 5]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 6]);
      num3 = (num3 << 8n) + BigInt(buffer[offset + 7]);
      return buffer[offset] <= 127 ? num3 : num3 - 0x10000000000000000n;
    }
  }

  // node_modules/bip174/src/esm/lib/converter/global/globalXpub.js
  var range = (n) => [...Array(n).keys()];
  function decode6(keyVal) {
    if (keyVal.key[0] !== GlobalTypes.GLOBAL_XPUB) {
      throw new Error(
        "Decode Error: could not decode globalXpub with key 0x" + toHex2(keyVal.key)
      );
    }
    if (keyVal.key.length !== 79 || ![2, 3].includes(keyVal.key[46])) {
      throw new Error(
        "Decode Error: globalXpub has invalid extended pubkey in key 0x" + toHex2(keyVal.key)
      );
    }
    if (keyVal.value.length / 4 % 1 !== 0) {
      throw new Error(
        "Decode Error: Global GLOBAL_XPUB value length should be multiple of 4"
      );
    }
    const extendedPubkey = keyVal.key.slice(1);
    const data = {
      masterFingerprint: keyVal.value.slice(0, 4),
      extendedPubkey,
      path: "m"
    };
    for (const i of range(keyVal.value.length / 4 - 1)) {
      const val = readUInt323(keyVal.value, i * 4 + 4, "LE");
      const isHard = !!(val & 2147483648);
      const idx = val & 2147483647;
      data.path += "/" + idx.toString(10) + (isHard ? "'" : "");
    }
    return data;
  }
  function encode6(data) {
    const head = new Uint8Array([GlobalTypes.GLOBAL_XPUB]);
    const key = concat2([head, data.extendedPubkey]);
    const splitPath = data.path.split("/");
    const value2 = new Uint8Array(splitPath.length * 4);
    value2.set(data.masterFingerprint, 0);
    let offset = 4;
    splitPath.slice(1).forEach((level) => {
      const isHard = level.slice(-1) === "'";
      let num2 = 2147483647 & parseInt(isHard ? level.slice(0, -1) : level, 10);
      if (isHard) num2 += 2147483648;
      writeUInt323(value2, offset, num2, "LE");
      offset += 4;
    });
    return {
      key,
      value: value2
    };
  }
  var expected = "{ masterFingerprint: Uint8Array; extendedPubkey: Uint8Array; path: string; }";
  function check2(data) {
    const epk = data.extendedPubkey;
    const mfp = data.masterFingerprint;
    const p = data.path;
    return epk instanceof Uint8Array && epk.length === 78 && [2, 3].indexOf(epk[45]) > -1 && mfp instanceof Uint8Array && mfp.length === 4 && typeof p === "string" && !!p.match(/^m(\/\d+'?)*$/);
  }
  function canAddToArray(array2, item, dupeSet) {
    const dupeString = toHex2(item.extendedPubkey);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare2(v.extendedPubkey, item.extendedPubkey)).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/global/unsignedTx.js
  var unsignedTx_exports = {};
  __export(unsignedTx_exports, {
    encode: () => encode7
  });
  function encode7(data) {
    return {
      key: new Uint8Array([GlobalTypes.UNSIGNED_TX]),
      value: data.toBuffer()
    };
  }

  // node_modules/bip174/src/esm/lib/converter/input/finalScriptSig.js
  var finalScriptSig_exports = {};
  __export(finalScriptSig_exports, {
    canAdd: () => canAdd,
    check: () => check3,
    decode: () => decode7,
    encode: () => encode8,
    expected: () => expected2
  });
  function decode7(keyVal) {
    if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTSIG) {
      throw new Error(
        "Decode Error: could not decode finalScriptSig with key 0x" + toHex2(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode8(data) {
    const key = new Uint8Array([InputTypes.FINAL_SCRIPTSIG]);
    return {
      key,
      value: data
    };
  }
  var expected2 = "Uint8Array";
  function check3(data) {
    return data instanceof Uint8Array;
  }
  function canAdd(currentData, newData) {
    return !!currentData && !!newData && currentData.finalScriptSig === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/finalScriptWitness.js
  var finalScriptWitness_exports = {};
  __export(finalScriptWitness_exports, {
    canAdd: () => canAdd2,
    check: () => check4,
    decode: () => decode8,
    encode: () => encode9,
    expected: () => expected3
  });
  function decode8(keyVal) {
    if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTWITNESS) {
      throw new Error(
        "Decode Error: could not decode finalScriptWitness with key 0x" + toHex2(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode9(data) {
    const key = new Uint8Array([InputTypes.FINAL_SCRIPTWITNESS]);
    return {
      key,
      value: data
    };
  }
  var expected3 = "Uint8Array";
  function check4(data) {
    return data instanceof Uint8Array;
  }
  function canAdd2(currentData, newData) {
    return !!currentData && !!newData && currentData.finalScriptWitness === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/nonWitnessUtxo.js
  var nonWitnessUtxo_exports = {};
  __export(nonWitnessUtxo_exports, {
    canAdd: () => canAdd3,
    check: () => check5,
    decode: () => decode9,
    encode: () => encode10,
    expected: () => expected4
  });
  function decode9(keyVal) {
    if (keyVal.key[0] !== InputTypes.NON_WITNESS_UTXO) {
      throw new Error(
        "Decode Error: could not decode nonWitnessUtxo with key 0x" + toHex2(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode10(data) {
    return {
      key: new Uint8Array([InputTypes.NON_WITNESS_UTXO]),
      value: data
    };
  }
  var expected4 = "Uint8Array";
  function check5(data) {
    return data instanceof Uint8Array;
  }
  function canAdd3(currentData, newData) {
    return !!currentData && !!newData && currentData.nonWitnessUtxo === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/partialSig.js
  var partialSig_exports = {};
  __export(partialSig_exports, {
    canAddToArray: () => canAddToArray2,
    check: () => check6,
    decode: () => decode10,
    encode: () => encode11,
    expected: () => expected5
  });
  function decode10(keyVal) {
    if (keyVal.key[0] !== InputTypes.PARTIAL_SIG) {
      throw new Error(
        "Decode Error: could not decode partialSig with key 0x" + toHex2(keyVal.key)
      );
    }
    if (!(keyVal.key.length === 34 || keyVal.key.length === 66) || ![2, 3, 4].includes(keyVal.key[1])) {
      throw new Error(
        "Decode Error: partialSig has invalid pubkey in key 0x" + toHex2(keyVal.key)
      );
    }
    const pubkey = keyVal.key.slice(1);
    return {
      pubkey,
      signature: keyVal.value
    };
  }
  function encode11(pSig) {
    const head = new Uint8Array([InputTypes.PARTIAL_SIG]);
    return {
      key: concat2([head, pSig.pubkey]),
      value: pSig.signature
    };
  }
  var expected5 = "{ pubkey: Uint8Array; signature: Uint8Array; }";
  function check6(data) {
    return data.pubkey instanceof Uint8Array && data.signature instanceof Uint8Array && [33, 65].includes(data.pubkey.length) && [2, 3, 4].includes(data.pubkey[0]) && isDerSigWithSighash(data.signature);
  }
  function isDerSigWithSighash(buf) {
    if (!(buf instanceof Uint8Array) || buf.length < 9) return false;
    if (buf[0] !== 48) return false;
    if (buf.length !== buf[1] + 3) return false;
    if (buf[2] !== 2) return false;
    const rLen = buf[3];
    if (rLen > 33 || rLen < 1) return false;
    if (buf[3 + rLen + 1] !== 2) return false;
    const sLen = buf[3 + rLen + 2];
    if (sLen > 33 || sLen < 1) return false;
    if (buf.length !== 3 + rLen + 2 + sLen + 2) return false;
    return true;
  }
  function canAddToArray2(array2, item, dupeSet) {
    const dupeString = toHex2(item.pubkey);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare2(v.pubkey, item.pubkey) === 0).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/porCommitment.js
  var porCommitment_exports = {};
  __export(porCommitment_exports, {
    canAdd: () => canAdd4,
    check: () => check7,
    decode: () => decode11,
    encode: () => encode12,
    expected: () => expected6
  });
  function decode11(keyVal) {
    if (keyVal.key[0] !== InputTypes.POR_COMMITMENT) {
      throw new Error(
        "Decode Error: could not decode porCommitment with key 0x" + toHex2(keyVal.key)
      );
    }
    return toUtf8(keyVal.value);
  }
  function encode12(data) {
    const key = new Uint8Array([InputTypes.POR_COMMITMENT]);
    return {
      key,
      value: fromUtf8(data)
    };
  }
  var expected6 = "string";
  function check7(data) {
    return typeof data === "string";
  }
  function canAdd4(currentData, newData) {
    return !!currentData && !!newData && currentData.porCommitment === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/sighashType.js
  var sighashType_exports = {};
  __export(sighashType_exports, {
    canAdd: () => canAdd5,
    check: () => check8,
    decode: () => decode12,
    encode: () => encode13,
    expected: () => expected7
  });
  function decode12(keyVal) {
    if (keyVal.key[0] !== InputTypes.SIGHASH_TYPE) {
      throw new Error(
        "Decode Error: could not decode sighashType with key 0x" + toHex2(keyVal.key)
      );
    }
    return Number(readUInt323(keyVal.value, 0, "LE"));
  }
  function encode13(data) {
    const key = Uint8Array.from([InputTypes.SIGHASH_TYPE]);
    const value2 = new Uint8Array(4);
    writeUInt323(value2, 0, data, "LE");
    return {
      key,
      value: value2
    };
  }
  var expected7 = "number";
  function check8(data) {
    return typeof data === "number";
  }
  function canAdd5(currentData, newData) {
    return !!currentData && !!newData && currentData.sighashType === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapKeySig.js
  var tapKeySig_exports = {};
  __export(tapKeySig_exports, {
    canAdd: () => canAdd6,
    check: () => check9,
    decode: () => decode13,
    encode: () => encode14,
    expected: () => expected8
  });
  function decode13(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_KEY_SIG || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapKeySig with key 0x" + toHex2(keyVal.key)
      );
    }
    if (!check9(keyVal.value)) {
      throw new Error(
        "Decode Error: tapKeySig not a valid 64-65-byte BIP340 signature"
      );
    }
    return keyVal.value;
  }
  function encode14(value2) {
    const key = Uint8Array.from([InputTypes.TAP_KEY_SIG]);
    return { key, value: value2 };
  }
  var expected8 = "Uint8Array";
  function check9(data) {
    return data instanceof Uint8Array && (data.length === 64 || data.length === 65);
  }
  function canAdd6(currentData, newData) {
    return !!currentData && !!newData && currentData.tapKeySig === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapLeafScript.js
  var tapLeafScript_exports = {};
  __export(tapLeafScript_exports, {
    canAddToArray: () => canAddToArray3,
    check: () => check10,
    decode: () => decode14,
    encode: () => encode15,
    expected: () => expected9
  });
  function decode14(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_LEAF_SCRIPT) {
      throw new Error(
        "Decode Error: could not decode tapLeafScript with key 0x" + toHex2(keyVal.key)
      );
    }
    if ((keyVal.key.length - 2) % 32 !== 0) {
      throw new Error(
        "Decode Error: tapLeafScript has invalid control block in key 0x" + toHex2(keyVal.key)
      );
    }
    const leafVersion = keyVal.value[keyVal.value.length - 1];
    if ((keyVal.key[1] & 254) !== leafVersion) {
      throw new Error(
        "Decode Error: tapLeafScript bad leaf version in key 0x" + toHex2(keyVal.key)
      );
    }
    const script = keyVal.value.slice(0, -1);
    const controlBlock = keyVal.key.slice(1);
    return { controlBlock, script, leafVersion };
  }
  function encode15(tScript) {
    const head = Uint8Array.from([InputTypes.TAP_LEAF_SCRIPT]);
    const verBuf = Uint8Array.from([tScript.leafVersion]);
    return {
      key: concat2([head, tScript.controlBlock]),
      value: concat2([tScript.script, verBuf])
    };
  }
  var expected9 = "{ controlBlock: Uint8Array; leafVersion: number, script: Uint8Array; }";
  function check10(data) {
    return data.controlBlock instanceof Uint8Array && (data.controlBlock.length - 1) % 32 === 0 && (data.controlBlock[0] & 254) === data.leafVersion && data.script instanceof Uint8Array;
  }
  function canAddToArray3(array2, item, dupeSet) {
    const dupeString = toHex2(item.controlBlock);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare2(v.controlBlock, item.controlBlock) === 0).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapMerkleRoot.js
  var tapMerkleRoot_exports = {};
  __export(tapMerkleRoot_exports, {
    canAdd: () => canAdd7,
    check: () => check11,
    decode: () => decode15,
    encode: () => encode16,
    expected: () => expected10
  });
  function decode15(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_MERKLE_ROOT || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapMerkleRoot with key 0x" + toHex2(keyVal.key)
      );
    }
    if (!check11(keyVal.value)) {
      throw new Error("Decode Error: tapMerkleRoot not a 32-byte hash");
    }
    return keyVal.value;
  }
  function encode16(value2) {
    const key = Uint8Array.from([InputTypes.TAP_MERKLE_ROOT]);
    return { key, value: value2 };
  }
  var expected10 = "Uint8Array";
  function check11(data) {
    return data instanceof Uint8Array && data.length === 32;
  }
  function canAdd7(currentData, newData) {
    return !!currentData && !!newData && currentData.tapMerkleRoot === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapScriptSig.js
  var tapScriptSig_exports = {};
  __export(tapScriptSig_exports, {
    canAddToArray: () => canAddToArray4,
    check: () => check12,
    decode: () => decode16,
    encode: () => encode17,
    expected: () => expected11
  });
  function decode16(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_SCRIPT_SIG) {
      throw new Error(
        "Decode Error: could not decode tapScriptSig with key 0x" + toHex2(keyVal.key)
      );
    }
    if (keyVal.key.length !== 65) {
      throw new Error(
        "Decode Error: tapScriptSig has invalid key 0x" + toHex2(keyVal.key)
      );
    }
    if (keyVal.value.length !== 64 && keyVal.value.length !== 65) {
      throw new Error(
        "Decode Error: tapScriptSig has invalid signature in key 0x" + toHex2(keyVal.key)
      );
    }
    const pubkey = keyVal.key.slice(1, 33);
    const leafHash = keyVal.key.slice(33);
    return {
      pubkey,
      leafHash,
      signature: keyVal.value
    };
  }
  function encode17(tSig) {
    const head = Uint8Array.from([InputTypes.TAP_SCRIPT_SIG]);
    return {
      key: concat2([head, tSig.pubkey, tSig.leafHash]),
      value: tSig.signature
    };
  }
  var expected11 = "{ pubkey: Uint8Array; leafHash: Uint8Array; signature: Uint8Array; }";
  function check12(data) {
    return data.pubkey instanceof Uint8Array && data.leafHash instanceof Uint8Array && data.signature instanceof Uint8Array && data.pubkey.length === 32 && data.leafHash.length === 32 && (data.signature.length === 64 || data.signature.length === 65);
  }
  function canAddToArray4(array2, item, dupeSet) {
    const dupeString = toHex2(item.pubkey) + toHex2(item.leafHash);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter(
      (v) => compare2(v.pubkey, item.pubkey) === 0 && compare2(v.leafHash, item.leafHash) === 0
    ).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/witnessUtxo.js
  var witnessUtxo_exports = {};
  __export(witnessUtxo_exports, {
    canAdd: () => canAdd8,
    check: () => check13,
    decode: () => decode17,
    encode: () => encode18,
    expected: () => expected12
  });
  function decode17(keyVal) {
    if (keyVal.key[0] !== InputTypes.WITNESS_UTXO) {
      throw new Error(
        "Decode Error: could not decode witnessUtxo with key 0x" + toHex2(keyVal.key)
      );
    }
    const value2 = readInt642(keyVal.value, 0, "LE");
    let _offset = 8;
    const { numberValue: scriptLen, bytes } = decode5(
      keyVal.value,
      _offset
    );
    _offset += bytes;
    const script = keyVal.value.slice(_offset);
    if (script.length !== scriptLen) {
      throw new Error("Decode Error: WITNESS_UTXO script is not proper length");
    }
    return {
      script,
      value: value2
    };
  }
  function encode18(data) {
    const { script, value: value2 } = data;
    const varuintlen = encodingLength2(script.length);
    const result = new Uint8Array(8 + varuintlen + script.length);
    writeInt642(result, 0, BigInt(value2), "LE");
    encode5(script.length, result, 8);
    result.set(script, 8 + varuintlen);
    return {
      key: Uint8Array.from([InputTypes.WITNESS_UTXO]),
      value: result
    };
  }
  var expected12 = "{ script: Uint8Array; value: bigint; }";
  function check13(data) {
    return data.script instanceof Uint8Array && typeof data.value === "bigint";
  }
  function canAdd8(currentData, newData) {
    return !!currentData && !!newData && currentData.witnessUtxo === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/output/tapTree.js
  var tapTree_exports = {};
  __export(tapTree_exports, {
    canAdd: () => canAdd9,
    check: () => check14,
    decode: () => decode18,
    encode: () => encode19,
    expected: () => expected13
  });
  function decode18(keyVal) {
    if (keyVal.key[0] !== OutputTypes.TAP_TREE || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapTree with key 0x" + toHex2(keyVal.key)
      );
    }
    let _offset = 0;
    const data = [];
    while (_offset < keyVal.value.length) {
      const depth = keyVal.value[_offset++];
      const leafVersion = keyVal.value[_offset++];
      const { numberValue: scriptLen, bytes } = decode5(
        keyVal.value,
        _offset
      );
      _offset += bytes;
      data.push({
        depth,
        leafVersion,
        script: keyVal.value.slice(_offset, _offset + scriptLen)
      });
      _offset += scriptLen;
    }
    return { leaves: data };
  }
  function encode19(tree) {
    const key = Uint8Array.from([OutputTypes.TAP_TREE]);
    const bufs = [].concat(
      ...tree.leaves.map((tapLeaf) => [
        Uint8Array.of(tapLeaf.depth, tapLeaf.leafVersion),
        encode5(BigInt(tapLeaf.script.length)).buffer,
        tapLeaf.script
      ])
    );
    return {
      key,
      value: concat2(bufs)
    };
  }
  var expected13 = "{ leaves: [{ depth: number; leafVersion: number, script: Uint8Array; }] }";
  function check14(data) {
    return Array.isArray(data.leaves) && data.leaves.every(
      (tapLeaf) => tapLeaf.depth >= 0 && tapLeaf.depth <= 128 && (tapLeaf.leafVersion & 254) === tapLeaf.leafVersion && tapLeaf.script instanceof Uint8Array
    );
  }
  function canAdd9(currentData, newData) {
    return !!currentData && !!newData && currentData.tapTree === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/shared/bip32Derivation.js
  var range2 = (n) => [...Array(n).keys()];
  var isValidDERKey = (pubkey) => pubkey.length === 33 && [2, 3].includes(pubkey[0]) || pubkey.length === 65 && 4 === pubkey[0];
  function makeConverter(TYPE_BYTE, isValidPubkey = isValidDERKey) {
    function decode20(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode bip32Derivation with key 0x" + toHex2(keyVal.key)
        );
      }
      const pubkey = keyVal.key.slice(1);
      if (!isValidPubkey(pubkey)) {
        throw new Error(
          "Decode Error: bip32Derivation has invalid pubkey in key 0x" + toHex2(keyVal.key)
        );
      }
      if (keyVal.value.length / 4 % 1 !== 0) {
        throw new Error(
          "Decode Error: Input BIP32_DERIVATION value length should be multiple of 4"
        );
      }
      const data = {
        masterFingerprint: keyVal.value.slice(0, 4),
        pubkey,
        path: "m"
      };
      for (const i of range2(keyVal.value.length / 4 - 1)) {
        const val = readUInt323(keyVal.value, i * 4 + 4, "LE");
        const isHard = !!(val & 2147483648);
        const idx = val & 2147483647;
        data.path += "/" + idx.toString(10) + (isHard ? "'" : "");
      }
      return data;
    }
    function encode21(data) {
      const head = Uint8Array.from([TYPE_BYTE]);
      const key = concat2([head, data.pubkey]);
      const splitPath = data.path.split("/");
      const value2 = new Uint8Array(splitPath.length * 4);
      value2.set(data.masterFingerprint, 0);
      let offset = 4;
      splitPath.slice(1).forEach((level) => {
        const isHard = level.slice(-1) === "'";
        let num2 = 2147483647 & parseInt(isHard ? level.slice(0, -1) : level, 10);
        if (isHard) num2 += 2147483648;
        writeUInt323(value2, offset, num2, "LE");
        offset += 4;
      });
      return {
        key,
        value: value2
      };
    }
    const expected14 = "{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; }";
    function check15(data) {
      return data.pubkey instanceof Uint8Array && data.masterFingerprint instanceof Uint8Array && typeof data.path === "string" && isValidPubkey(data.pubkey) && data.masterFingerprint.length === 4;
    }
    function canAddToArray5(array2, item, dupeSet) {
      const dupeString = toHex2(item.pubkey);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return array2.filter((v) => compare2(v.pubkey, item.pubkey) === 0).length === 0;
    }
    return {
      decode: decode20,
      encode: encode21,
      check: check15,
      expected: expected14,
      canAddToArray: canAddToArray5
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/checkPubkey.js
  function makeChecker(pubkeyTypes) {
    return checkPubkey;
    function checkPubkey(keyVal) {
      let pubkey;
      if (pubkeyTypes.includes(keyVal.key[0])) {
        pubkey = keyVal.key.slice(1);
        if (!(pubkey.length === 33 || pubkey.length === 65) || ![2, 3, 4].includes(pubkey[0])) {
          throw new Error(
            "Format Error: invalid pubkey in key 0x" + toHex2(keyVal.key)
          );
        }
      }
      return pubkey;
    }
  }

  // node_modules/bip174/src/esm/lib/converter/shared/redeemScript.js
  function makeConverter2(TYPE_BYTE) {
    function decode20(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode redeemScript with key 0x" + toHex2(keyVal.key)
        );
      }
      return keyVal.value;
    }
    function encode21(data) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return {
        key,
        value: data
      };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.redeemScript === void 0;
    }
    return {
      decode: decode20,
      encode: encode21,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/tapBip32Derivation.js
  var isValidBIP340Key = (pubkey) => pubkey.length === 32;
  function makeConverter3(TYPE_BYTE) {
    const parent = makeConverter(TYPE_BYTE, isValidBIP340Key);
    function decode20(keyVal) {
      const { numberValue: nHashes, bytes: nHashesLen } = decode5(
        keyVal.value
      );
      const base2 = parent.decode({
        key: keyVal.key,
        value: keyVal.value.slice(nHashesLen + Number(nHashes) * 32)
      });
      const leafHashes = new Array(Number(nHashes));
      for (let i = 0, _offset = nHashesLen; i < nHashes; i++, _offset += 32) {
        leafHashes[i] = keyVal.value.slice(_offset, _offset + 32);
      }
      return { ...base2, leafHashes };
    }
    function encode21(data) {
      const base2 = parent.encode(data);
      const nHashesLen = encodingLength2(data.leafHashes.length);
      const nHashesBuf = new Uint8Array(nHashesLen);
      encode5(data.leafHashes.length, nHashesBuf);
      const value2 = concat2([nHashesBuf, ...data.leafHashes, base2.value]);
      return { ...base2, value: value2 };
    }
    const expected14 = "{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; leafHashes: Uint8Array[]; }";
    function check15(data) {
      return Array.isArray(data.leafHashes) && data.leafHashes.every(
        (leafHash) => leafHash instanceof Uint8Array && leafHash.length === 32
      ) && parent.check(data);
    }
    return {
      decode: decode20,
      encode: encode21,
      check: check15,
      expected: expected14,
      canAddToArray: parent.canAddToArray
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/tapInternalKey.js
  function makeConverter4(TYPE_BYTE) {
    function decode20(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE || keyVal.key.length !== 1) {
        throw new Error(
          "Decode Error: could not decode tapInternalKey with key 0x" + toHex2(keyVal.key)
        );
      }
      if (keyVal.value.length !== 32) {
        throw new Error(
          "Decode Error: tapInternalKey not a 32-byte x-only pubkey"
        );
      }
      return keyVal.value;
    }
    function encode21(value2) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return { key, value: value2 };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array && data.length === 32;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.tapInternalKey === void 0;
    }
    return {
      decode: decode20,
      encode: encode21,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/witnessScript.js
  function makeConverter5(TYPE_BYTE) {
    function decode20(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode witnessScript with key 0x" + toHex2(keyVal.key)
        );
      }
      return keyVal.value;
    }
    function encode21(data) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return {
        key,
        value: data
      };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.witnessScript === void 0;
    }
    return {
      decode: decode20,
      encode: encode21,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/index.js
  var globals = {
    unsignedTx: unsignedTx_exports,
    globalXpub: globalXpub_exports,
    // pass an Array of key bytes that require pubkey beside the key
    checkPubkey: makeChecker([])
  };
  var inputs = {
    nonWitnessUtxo: nonWitnessUtxo_exports,
    partialSig: partialSig_exports,
    sighashType: sighashType_exports,
    finalScriptSig: finalScriptSig_exports,
    finalScriptWitness: finalScriptWitness_exports,
    porCommitment: porCommitment_exports,
    witnessUtxo: witnessUtxo_exports,
    bip32Derivation: makeConverter(InputTypes.BIP32_DERIVATION),
    redeemScript: makeConverter2(InputTypes.REDEEM_SCRIPT),
    witnessScript: makeConverter5(InputTypes.WITNESS_SCRIPT),
    checkPubkey: makeChecker([
      InputTypes.PARTIAL_SIG,
      InputTypes.BIP32_DERIVATION
    ]),
    tapKeySig: tapKeySig_exports,
    tapScriptSig: tapScriptSig_exports,
    tapLeafScript: tapLeafScript_exports,
    tapBip32Derivation: makeConverter3(
      InputTypes.TAP_BIP32_DERIVATION
    ),
    tapInternalKey: makeConverter4(InputTypes.TAP_INTERNAL_KEY),
    tapMerkleRoot: tapMerkleRoot_exports
  };
  var outputs = {
    bip32Derivation: makeConverter(OutputTypes.BIP32_DERIVATION),
    redeemScript: makeConverter2(OutputTypes.REDEEM_SCRIPT),
    witnessScript: makeConverter5(OutputTypes.WITNESS_SCRIPT),
    checkPubkey: makeChecker([OutputTypes.BIP32_DERIVATION]),
    tapBip32Derivation: makeConverter3(
      OutputTypes.TAP_BIP32_DERIVATION
    ),
    tapTree: tapTree_exports,
    tapInternalKey: makeConverter4(OutputTypes.TAP_INTERNAL_KEY)
  };

  // node_modules/bip174/src/esm/lib/converter/tools.js
  var range3 = (n) => [...Array(n).keys()];
  function keyValsToBuffer(keyVals) {
    const buffers = keyVals.map(keyValToBuffer);
    buffers.push(Uint8Array.from([0]));
    return concat2(buffers);
  }
  function keyValToBuffer(keyVal) {
    const keyLen = keyVal.key.length;
    const valLen = keyVal.value.length;
    const keyVarIntLen = encodingLength2(keyLen);
    const valVarIntLen = encodingLength2(valLen);
    const buffer = new Uint8Array(keyVarIntLen + keyLen + valVarIntLen + valLen);
    encode5(keyLen, buffer, 0);
    buffer.set(keyVal.key, keyVarIntLen);
    encode5(valLen, buffer, keyVarIntLen + keyLen);
    buffer.set(keyVal.value, keyVarIntLen + keyLen + valVarIntLen);
    return buffer;
  }

  // node_modules/bip174/src/esm/lib/parser/fromBuffer.js
  function psbtFromBuffer(buffer, txGetter) {
    let offset = 0;
    function varSlice() {
      const { numberValue: keyLen, bytes } = decode5(buffer, offset);
      offset += bytes;
      const key = buffer.slice(offset, offset + Number(keyLen));
      offset += Number(keyLen);
      return key;
    }
    function readUInt32BE() {
      const num2 = readUInt323(buffer, offset, "BE");
      offset += 4;
      return num2;
    }
    function readUInt83() {
      const num2 = readUInt82(buffer, offset);
      offset += 1;
      return num2;
    }
    function getKeyValue() {
      const key = varSlice();
      const value2 = varSlice();
      return {
        key,
        value: value2
      };
    }
    function checkEndOfKeyValPairs() {
      if (offset >= buffer.length) {
        throw new Error("Format Error: Unexpected End of PSBT");
      }
      const isEnd = readUInt82(buffer, offset) === 0;
      if (isEnd) {
        offset++;
      }
      return isEnd;
    }
    if (readUInt32BE() !== 1886610036) {
      throw new Error("Format Error: Invalid Magic Number");
    }
    if (readUInt83() !== 255) {
      throw new Error(
        "Format Error: Magic Number must be followed by 0xff separator"
      );
    }
    const globalMapKeyVals = [];
    const globalKeyIndex = {};
    while (!checkEndOfKeyValPairs()) {
      const keyVal = getKeyValue();
      const hexKey = toHex2(keyVal.key);
      if (globalKeyIndex[hexKey]) {
        throw new Error(
          "Format Error: Keys must be unique for global keymap: key " + hexKey
        );
      }
      globalKeyIndex[hexKey] = 1;
      globalMapKeyVals.push(keyVal);
    }
    const unsignedTxMaps = globalMapKeyVals.filter(
      (keyVal) => keyVal.key[0] === GlobalTypes.UNSIGNED_TX
    );
    if (unsignedTxMaps.length !== 1) {
      throw new Error("Format Error: Only one UNSIGNED_TX allowed");
    }
    const unsignedTx = txGetter(unsignedTxMaps[0].value);
    const { inputCount, outputCount } = unsignedTx.getInputOutputCounts();
    const inputKeyVals = [];
    const outputKeyVals = [];
    for (const index of range3(inputCount)) {
      const inputKeyIndex = {};
      const input = [];
      while (!checkEndOfKeyValPairs()) {
        const keyVal = getKeyValue();
        const hexKey = toHex2(keyVal.key);
        if (inputKeyIndex[hexKey]) {
          throw new Error(
            "Format Error: Keys must be unique for each input: input index " + index + " key " + hexKey
          );
        }
        inputKeyIndex[hexKey] = 1;
        input.push(keyVal);
      }
      inputKeyVals.push(input);
    }
    for (const index of range3(outputCount)) {
      const outputKeyIndex = {};
      const output = [];
      while (!checkEndOfKeyValPairs()) {
        const keyVal = getKeyValue();
        const hexKey = toHex2(keyVal.key);
        if (outputKeyIndex[hexKey]) {
          throw new Error(
            "Format Error: Keys must be unique for each output: output index " + index + " key " + hexKey
          );
        }
        outputKeyIndex[hexKey] = 1;
        output.push(keyVal);
      }
      outputKeyVals.push(output);
    }
    return psbtFromKeyVals(unsignedTx, {
      globalMapKeyVals,
      inputKeyVals,
      outputKeyVals
    });
  }
  function checkKeyBuffer(type, keyBuf, keyNum) {
    if (compare2(keyBuf, Uint8Array.from([keyNum]))) {
      throw new Error(
        // `Format Error: Invalid ${type} key: ${keyBuf.toString('hex')}`,
        `Format Error: Invalid ${type} key: ${toHex2(keyBuf)}`
      );
    }
  }
  function psbtFromKeyVals(unsignedTx, { globalMapKeyVals, inputKeyVals, outputKeyVals }) {
    const globalMap = {
      unsignedTx
    };
    let txCount = 0;
    for (const keyVal of globalMapKeyVals) {
      switch (keyVal.key[0]) {
        case GlobalTypes.UNSIGNED_TX:
          checkKeyBuffer("global", keyVal.key, GlobalTypes.UNSIGNED_TX);
          if (txCount > 0) {
            throw new Error("Format Error: GlobalMap has multiple UNSIGNED_TX");
          }
          txCount++;
          break;
        case GlobalTypes.GLOBAL_XPUB:
          if (globalMap.globalXpub === void 0) {
            globalMap.globalXpub = [];
          }
          globalMap.globalXpub.push(globals.globalXpub.decode(keyVal));
          break;
        default:
          if (!globalMap.unknownKeyVals) globalMap.unknownKeyVals = [];
          globalMap.unknownKeyVals.push(keyVal);
      }
    }
    const inputCount = inputKeyVals.length;
    const outputCount = outputKeyVals.length;
    const inputs2 = [];
    const outputs2 = [];
    for (const index of range3(inputCount)) {
      const input = {};
      for (const keyVal of inputKeyVals[index]) {
        inputs.checkPubkey(keyVal);
        switch (keyVal.key[0]) {
          case InputTypes.NON_WITNESS_UTXO:
            checkKeyBuffer("input", keyVal.key, InputTypes.NON_WITNESS_UTXO);
            if (input.nonWitnessUtxo !== void 0) {
              throw new Error(
                "Format Error: Input has multiple NON_WITNESS_UTXO"
              );
            }
            input.nonWitnessUtxo = inputs.nonWitnessUtxo.decode(keyVal);
            break;
          case InputTypes.WITNESS_UTXO:
            checkKeyBuffer("input", keyVal.key, InputTypes.WITNESS_UTXO);
            if (input.witnessUtxo !== void 0) {
              throw new Error("Format Error: Input has multiple WITNESS_UTXO");
            }
            input.witnessUtxo = inputs.witnessUtxo.decode(keyVal);
            break;
          case InputTypes.PARTIAL_SIG:
            if (input.partialSig === void 0) {
              input.partialSig = [];
            }
            input.partialSig.push(inputs.partialSig.decode(keyVal));
            break;
          case InputTypes.SIGHASH_TYPE:
            checkKeyBuffer("input", keyVal.key, InputTypes.SIGHASH_TYPE);
            if (input.sighashType !== void 0) {
              throw new Error("Format Error: Input has multiple SIGHASH_TYPE");
            }
            input.sighashType = inputs.sighashType.decode(keyVal);
            break;
          case InputTypes.REDEEM_SCRIPT:
            checkKeyBuffer("input", keyVal.key, InputTypes.REDEEM_SCRIPT);
            if (input.redeemScript !== void 0) {
              throw new Error("Format Error: Input has multiple REDEEM_SCRIPT");
            }
            input.redeemScript = inputs.redeemScript.decode(keyVal);
            break;
          case InputTypes.WITNESS_SCRIPT:
            checkKeyBuffer("input", keyVal.key, InputTypes.WITNESS_SCRIPT);
            if (input.witnessScript !== void 0) {
              throw new Error("Format Error: Input has multiple WITNESS_SCRIPT");
            }
            input.witnessScript = inputs.witnessScript.decode(keyVal);
            break;
          case InputTypes.BIP32_DERIVATION:
            if (input.bip32Derivation === void 0) {
              input.bip32Derivation = [];
            }
            input.bip32Derivation.push(
              inputs.bip32Derivation.decode(keyVal)
            );
            break;
          case InputTypes.FINAL_SCRIPTSIG:
            checkKeyBuffer("input", keyVal.key, InputTypes.FINAL_SCRIPTSIG);
            input.finalScriptSig = inputs.finalScriptSig.decode(keyVal);
            break;
          case InputTypes.FINAL_SCRIPTWITNESS:
            checkKeyBuffer("input", keyVal.key, InputTypes.FINAL_SCRIPTWITNESS);
            input.finalScriptWitness = inputs.finalScriptWitness.decode(
              keyVal
            );
            break;
          case InputTypes.POR_COMMITMENT:
            checkKeyBuffer("input", keyVal.key, InputTypes.POR_COMMITMENT);
            input.porCommitment = inputs.porCommitment.decode(keyVal);
            break;
          case InputTypes.TAP_KEY_SIG:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_KEY_SIG);
            input.tapKeySig = inputs.tapKeySig.decode(keyVal);
            break;
          case InputTypes.TAP_SCRIPT_SIG:
            if (input.tapScriptSig === void 0) {
              input.tapScriptSig = [];
            }
            input.tapScriptSig.push(inputs.tapScriptSig.decode(keyVal));
            break;
          case InputTypes.TAP_LEAF_SCRIPT:
            if (input.tapLeafScript === void 0) {
              input.tapLeafScript = [];
            }
            input.tapLeafScript.push(inputs.tapLeafScript.decode(keyVal));
            break;
          case InputTypes.TAP_BIP32_DERIVATION:
            if (input.tapBip32Derivation === void 0) {
              input.tapBip32Derivation = [];
            }
            input.tapBip32Derivation.push(
              inputs.tapBip32Derivation.decode(keyVal)
            );
            break;
          case InputTypes.TAP_INTERNAL_KEY:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_INTERNAL_KEY);
            input.tapInternalKey = inputs.tapInternalKey.decode(keyVal);
            break;
          case InputTypes.TAP_MERKLE_ROOT:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_MERKLE_ROOT);
            input.tapMerkleRoot = inputs.tapMerkleRoot.decode(keyVal);
            break;
          default:
            if (!input.unknownKeyVals) input.unknownKeyVals = [];
            input.unknownKeyVals.push(keyVal);
        }
      }
      inputs2.push(input);
    }
    for (const index of range3(outputCount)) {
      const output = {};
      for (const keyVal of outputKeyVals[index]) {
        outputs.checkPubkey(keyVal);
        switch (keyVal.key[0]) {
          case OutputTypes.REDEEM_SCRIPT:
            checkKeyBuffer("output", keyVal.key, OutputTypes.REDEEM_SCRIPT);
            if (output.redeemScript !== void 0) {
              throw new Error("Format Error: Output has multiple REDEEM_SCRIPT");
            }
            output.redeemScript = outputs.redeemScript.decode(keyVal);
            break;
          case OutputTypes.WITNESS_SCRIPT:
            checkKeyBuffer("output", keyVal.key, OutputTypes.WITNESS_SCRIPT);
            if (output.witnessScript !== void 0) {
              throw new Error("Format Error: Output has multiple WITNESS_SCRIPT");
            }
            output.witnessScript = outputs.witnessScript.decode(keyVal);
            break;
          case OutputTypes.BIP32_DERIVATION:
            if (output.bip32Derivation === void 0) {
              output.bip32Derivation = [];
            }
            output.bip32Derivation.push(
              outputs.bip32Derivation.decode(keyVal)
            );
            break;
          case OutputTypes.TAP_INTERNAL_KEY:
            checkKeyBuffer("output", keyVal.key, OutputTypes.TAP_INTERNAL_KEY);
            output.tapInternalKey = outputs.tapInternalKey.decode(keyVal);
            break;
          case OutputTypes.TAP_TREE:
            checkKeyBuffer("output", keyVal.key, OutputTypes.TAP_TREE);
            output.tapTree = outputs.tapTree.decode(keyVal);
            break;
          case OutputTypes.TAP_BIP32_DERIVATION:
            if (output.tapBip32Derivation === void 0) {
              output.tapBip32Derivation = [];
            }
            output.tapBip32Derivation.push(
              outputs.tapBip32Derivation.decode(keyVal)
            );
            break;
          default:
            if (!output.unknownKeyVals) output.unknownKeyVals = [];
            output.unknownKeyVals.push(keyVal);
        }
      }
      outputs2.push(output);
    }
    return { globalMap, inputs: inputs2, outputs: outputs2 };
  }

  // node_modules/bip174/src/esm/lib/parser/toBuffer.js
  function psbtToBuffer({ globalMap, inputs: inputs2, outputs: outputs2 }) {
    const { globalKeyVals, inputKeyVals, outputKeyVals } = psbtToKeyVals({
      globalMap,
      inputs: inputs2,
      outputs: outputs2
    });
    const globalBuffer = keyValsToBuffer(globalKeyVals);
    const keyValsOrEmptyToBuffer = (keyVals) => keyVals.length === 0 ? [Uint8Array.from([0])] : keyVals.map(keyValsToBuffer);
    const inputBuffers = keyValsOrEmptyToBuffer(inputKeyVals);
    const outputBuffers = keyValsOrEmptyToBuffer(outputKeyVals);
    const header = new Uint8Array(5);
    header.set([112, 115, 98, 116, 255], 0);
    return concat2(
      [header, globalBuffer].concat(inputBuffers, outputBuffers)
    );
  }
  var sortKeyVals = (a, b) => {
    return compare2(a.key, b.key);
  };
  function keyValsFromMap(keyValMap, converterFactory) {
    const keyHexSet = /* @__PURE__ */ new Set();
    const keyVals = Object.entries(keyValMap).reduce((result, [key, value2]) => {
      if (key === "unknownKeyVals") return result;
      const converter = converterFactory[key];
      if (converter === void 0) return result;
      const encodedKeyVals = (Array.isArray(value2) ? value2 : [value2]).map(
        converter.encode
      );
      const keyHexes = encodedKeyVals.map((kv) => toHex2(kv.key));
      keyHexes.forEach((hex) => {
        if (keyHexSet.has(hex))
          throw new Error("Serialize Error: Duplicate key: " + hex);
        keyHexSet.add(hex);
      });
      return result.concat(encodedKeyVals);
    }, []);
    const otherKeyVals = keyValMap.unknownKeyVals ? keyValMap.unknownKeyVals.filter((keyVal) => {
      return !keyHexSet.has(toHex2(keyVal.key));
    }) : [];
    return keyVals.concat(otherKeyVals).sort(sortKeyVals);
  }
  function psbtToKeyVals({ globalMap, inputs: inputs2, outputs: outputs2 }) {
    return {
      globalKeyVals: keyValsFromMap(globalMap, globals),
      inputKeyVals: inputs2.map((i) => keyValsFromMap(i, inputs)),
      outputKeyVals: outputs2.map((o) => keyValsFromMap(o, outputs))
    };
  }

  // node_modules/bip174/src/esm/lib/combiner/index.js
  function combine(psbts) {
    const self = psbts[0];
    const selfKeyVals = psbtToKeyVals(self);
    const others = psbts.slice(1);
    if (others.length === 0) throw new Error("Combine: Nothing to combine");
    const selfTx = getTx(self);
    if (selfTx === void 0) {
      throw new Error("Combine: Self missing transaction");
    }
    const selfGlobalSet = getKeySet(selfKeyVals.globalKeyVals);
    const selfInputSets = selfKeyVals.inputKeyVals.map(getKeySet);
    const selfOutputSets = selfKeyVals.outputKeyVals.map(getKeySet);
    for (const other of others) {
      const otherTx = getTx(other);
      if (otherTx === void 0 || compare2(otherTx.toBuffer(), selfTx.toBuffer()) !== 0) {
        throw new Error(
          "Combine: One of the Psbts does not have the same transaction."
        );
      }
      const otherKeyVals = psbtToKeyVals(other);
      const otherGlobalSet = getKeySet(otherKeyVals.globalKeyVals);
      otherGlobalSet.forEach(
        keyPusher(
          selfGlobalSet,
          selfKeyVals.globalKeyVals,
          otherKeyVals.globalKeyVals
        )
      );
      const otherInputSets = otherKeyVals.inputKeyVals.map(getKeySet);
      otherInputSets.forEach(
        (inputSet, idx) => inputSet.forEach(
          keyPusher(
            selfInputSets[idx],
            selfKeyVals.inputKeyVals[idx],
            otherKeyVals.inputKeyVals[idx]
          )
        )
      );
      const otherOutputSets = otherKeyVals.outputKeyVals.map(getKeySet);
      otherOutputSets.forEach(
        (outputSet, idx) => outputSet.forEach(
          keyPusher(
            selfOutputSets[idx],
            selfKeyVals.outputKeyVals[idx],
            otherKeyVals.outputKeyVals[idx]
          )
        )
      );
    }
    return psbtFromKeyVals(selfTx, {
      globalMapKeyVals: selfKeyVals.globalKeyVals,
      inputKeyVals: selfKeyVals.inputKeyVals,
      outputKeyVals: selfKeyVals.outputKeyVals
    });
  }
  function keyPusher(selfSet, selfKeyVals, otherKeyVals) {
    return (key) => {
      if (selfSet.has(key)) return;
      const newKv = otherKeyVals.filter((kv) => toHex2(kv.key) === key)[0];
      selfKeyVals.push(newKv);
      selfSet.add(key);
    };
  }
  function getTx(psbt) {
    return psbt.globalMap.unsignedTx;
  }
  function getKeySet(keyVals) {
    const set = /* @__PURE__ */ new Set();
    keyVals.forEach((keyVal) => {
      const hex = toHex2(keyVal.key);
      if (set.has(hex))
        throw new Error("Combine: KeyValue Map keys should be unique");
      set.add(hex);
    });
    return set;
  }

  // node_modules/bip174/src/esm/lib/utils.js
  function checkForInput(inputs2, inputIndex) {
    const input = inputs2[inputIndex];
    if (input === void 0) throw new Error(`No input #${inputIndex}`);
    return input;
  }
  function checkForOutput(outputs2, outputIndex) {
    const output = outputs2[outputIndex];
    if (output === void 0) throw new Error(`No output #${outputIndex}`);
    return output;
  }
  function checkHasKey(checkKeyVal, keyVals, enumLength) {
    if (checkKeyVal.key[0] < enumLength) {
      throw new Error(
        `Use the method for your specific key instead of addUnknownKeyVal*`
      );
    }
    if (keyVals && keyVals.filter((kv) => compare2(kv.key, checkKeyVal.key) === 0).length !== 0) {
      throw new Error(`Duplicate Key: ${toHex2(checkKeyVal.key)}`);
    }
  }
  function getEnumLength(myenum) {
    let count = 0;
    Object.keys(myenum).forEach((val) => {
      if (Number(isNaN(Number(val)))) {
        count++;
      }
    });
    return count;
  }
  function inputCheckUncleanFinalized(inputIndex, input) {
    let result = false;
    if (input.nonWitnessUtxo || input.witnessUtxo) {
      const needScriptSig = !!input.redeemScript;
      const needWitnessScript = !!input.witnessScript;
      const scriptSigOK = !needScriptSig || !!input.finalScriptSig;
      const witnessScriptOK = !needWitnessScript || !!input.finalScriptWitness;
      const hasOneFinal = !!input.finalScriptSig || !!input.finalScriptWitness;
      result = scriptSigOK && witnessScriptOK && hasOneFinal;
    }
    if (result === false) {
      throw new Error(
        `Input #${inputIndex} has too much or too little data to clean`
      );
    }
  }
  function throwForUpdateMaker(typeName, name, expected14, data) {
    throw new Error(
      `Data for ${typeName} key ${name} is incorrect: Expected ${expected14} and got ${JSON.stringify(data)}`
    );
  }
  function updateMaker(typeName) {
    return (updateData, mainData) => {
      for (const name of Object.keys(updateData)) {
        const data = updateData[name];
        const { canAdd: canAdd10, canAddToArray: canAddToArray5, check: check15, expected: expected14 } = (
          // @ts-ignore
          converter_exports[typeName + "s"][name] || {}
        );
        const isArray = !!canAddToArray5;
        if (check15) {
          if (isArray) {
            if (!Array.isArray(data) || // @ts-ignore
            mainData[name] && !Array.isArray(mainData[name])) {
              throw new Error(`Key type ${name} must be an array`);
            }
            if (!data.every(check15)) {
              throwForUpdateMaker(typeName, name, expected14, data);
            }
            const arr = mainData[name] || [];
            const dupeCheckSet = /* @__PURE__ */ new Set();
            if (!data.every((v) => canAddToArray5(arr, v, dupeCheckSet))) {
              throw new Error("Can not add duplicate data to array");
            }
            mainData[name] = arr.concat(data);
          } else {
            if (!check15(data)) {
              throwForUpdateMaker(typeName, name, expected14, data);
            }
            if (!canAdd10(mainData, data)) {
              throw new Error(`Can not add duplicate data to ${typeName}`);
            }
            mainData[name] = data;
          }
        }
      }
    };
  }
  var updateGlobal = updateMaker("global");
  var updateInput = updateMaker("input");
  var updateOutput = updateMaker("output");
  function addInputAttributes(inputs2, data) {
    const index = inputs2.length - 1;
    const input = checkForInput(inputs2, index);
    updateInput(data, input);
  }
  function addOutputAttributes(outputs2, data) {
    const index = outputs2.length - 1;
    const output = checkForOutput(outputs2, index);
    updateOutput(data, output);
  }

  // node_modules/bip174/src/esm/lib/psbt.js
  var Psbt = class {
    constructor(tx) {
      this.inputs = [];
      this.outputs = [];
      this.globalMap = {
        unsignedTx: tx
      };
    }
    static fromBase64(data, txFromBuffer) {
      const buffer = fromBase642(data);
      return this.fromBuffer(buffer, txFromBuffer);
    }
    static fromHex(data, txFromBuffer) {
      const buffer = fromHex2(data);
      return this.fromBuffer(buffer, txFromBuffer);
    }
    static fromBuffer(buffer, txFromBuffer) {
      const results = psbtFromBuffer(buffer, txFromBuffer);
      const psbt = new this(results.globalMap.unsignedTx);
      Object.assign(psbt, results);
      return psbt;
    }
    toBase64() {
      const buffer = this.toBuffer();
      return toBase64(buffer);
    }
    toHex() {
      const buffer = this.toBuffer();
      return toHex2(buffer);
    }
    toBuffer() {
      return psbtToBuffer(this);
    }
    updateGlobal(updateData) {
      updateGlobal(updateData, this.globalMap);
      return this;
    }
    updateInput(inputIndex, updateData) {
      const input = checkForInput(this.inputs, inputIndex);
      updateInput(updateData, input);
      return this;
    }
    updateOutput(outputIndex, updateData) {
      const output = checkForOutput(this.outputs, outputIndex);
      updateOutput(updateData, output);
      return this;
    }
    addUnknownKeyValToGlobal(keyVal) {
      checkHasKey(
        keyVal,
        this.globalMap.unknownKeyVals,
        getEnumLength(GlobalTypes)
      );
      if (!this.globalMap.unknownKeyVals) this.globalMap.unknownKeyVals = [];
      this.globalMap.unknownKeyVals.push(keyVal);
      return this;
    }
    addUnknownKeyValToInput(inputIndex, keyVal) {
      const input = checkForInput(this.inputs, inputIndex);
      checkHasKey(keyVal, input.unknownKeyVals, getEnumLength(InputTypes));
      if (!input.unknownKeyVals) input.unknownKeyVals = [];
      input.unknownKeyVals.push(keyVal);
      return this;
    }
    addUnknownKeyValToOutput(outputIndex, keyVal) {
      const output = checkForOutput(this.outputs, outputIndex);
      checkHasKey(keyVal, output.unknownKeyVals, getEnumLength(OutputTypes));
      if (!output.unknownKeyVals) output.unknownKeyVals = [];
      output.unknownKeyVals.push(keyVal);
      return this;
    }
    addInput(inputData) {
      this.globalMap.unsignedTx.addInput(inputData);
      this.inputs.push({
        unknownKeyVals: []
      });
      const addKeyVals = inputData.unknownKeyVals || [];
      const inputIndex = this.inputs.length - 1;
      if (!Array.isArray(addKeyVals)) {
        throw new Error("unknownKeyVals must be an Array");
      }
      addKeyVals.forEach(
        (keyVal) => this.addUnknownKeyValToInput(inputIndex, keyVal)
      );
      addInputAttributes(this.inputs, inputData);
      return this;
    }
    addOutput(outputData) {
      this.globalMap.unsignedTx.addOutput(outputData);
      this.outputs.push({
        unknownKeyVals: []
      });
      const addKeyVals = outputData.unknownKeyVals || [];
      const outputIndex = this.outputs.length - 1;
      if (!Array.isArray(addKeyVals)) {
        throw new Error("unknownKeyVals must be an Array");
      }
      addKeyVals.forEach(
        (keyVal) => this.addUnknownKeyValToOutput(outputIndex, keyVal)
      );
      addOutputAttributes(this.outputs, outputData);
      return this;
    }
    clearFinalizedInput(inputIndex) {
      const input = checkForInput(this.inputs, inputIndex);
      inputCheckUncleanFinalized(inputIndex, input);
      for (const key of Object.keys(input)) {
        if (![
          "witnessUtxo",
          "nonWitnessUtxo",
          "finalScriptSig",
          "finalScriptWitness",
          "unknownKeyVals"
        ].includes(key)) {
          delete input[key];
        }
      }
      return this;
    }
    combine(...those) {
      const result = combine([this].concat(those));
      Object.assign(this, result);
      return this;
    }
    getTransaction() {
      return this.globalMap.unsignedTx.toBuffer();
    }
  };

  // node_modules/bitcoinjs-lib/src/esm/psbt/psbtutils.js
  function isPaymentFactory(payment) {
    return (script) => {
      try {
        payment({ output: script });
        return true;
      } catch (err) {
        return false;
      }
    };
  }
  var isP2MS = isPaymentFactory(p2ms);
  var isP2PK = isPaymentFactory(p2pk);
  var isP2PKH = isPaymentFactory(p2pkh);
  var isP2WPKH = isPaymentFactory(p2wpkh);
  var isP2WSHScript = isPaymentFactory(p2wsh);
  var isP2SHScript = isPaymentFactory(p2sh);
  var isP2TR = isPaymentFactory(p2tr);
  function witnessStackToScriptWitness(witness) {
    let buffer = new Uint8Array(0);
    function writeSlice(slice) {
      buffer = concat([buffer, slice]);
    }
    function writeVarInt(i) {
      const currentLen = buffer.length;
      const varintLen = encodingLength2(i);
      buffer = concat([buffer, new Uint8Array(varintLen)]);
      encode5(i, buffer, currentLen);
    }
    function writeVarSlice(slice) {
      writeVarInt(slice.length);
      writeSlice(slice);
    }
    function writeVector(vector) {
      writeVarInt(vector.length);
      vector.forEach(writeVarSlice);
    }
    writeVector(witness);
    return buffer;
  }
  function pubkeyPositionInScript(pubkey, script) {
    const pubkeyHash = hash160(pubkey);
    const pubkeyXOnly = pubkey.slice(1, 33);
    const decompiled = decompile(script);
    if (decompiled === null) throw new Error("Unknown script error");
    return decompiled.findIndex((element) => {
      if (typeof element === "number") return false;
      return compare(pubkey, element) === 0 || compare(pubkeyHash, element) === 0 || compare(pubkeyXOnly, element) === 0;
    });
  }
  function pubkeyInScript(pubkey, script) {
    return pubkeyPositionInScript(pubkey, script) !== -1;
  }
  function checkInputForSig(input, action) {
    const pSigs = extractPartialSigs(input);
    return pSigs.some(
      (pSig) => signatureBlocksAction(pSig, signature.decode, action)
    );
  }
  function signatureBlocksAction(signature2, signatureDecodeFn, action) {
    const { hashType } = signatureDecodeFn(signature2);
    const whitelist = [];
    const isAnyoneCanPay = hashType & Transaction.SIGHASH_ANYONECANPAY;
    if (isAnyoneCanPay) whitelist.push("addInput");
    const hashMod = hashType & 31;
    switch (hashMod) {
      case Transaction.SIGHASH_ALL:
        break;
      case Transaction.SIGHASH_SINGLE:
      case Transaction.SIGHASH_NONE:
        whitelist.push("addOutput");
        whitelist.push("setInputSequence");
        break;
    }
    if (whitelist.indexOf(action) === -1) {
      return true;
    }
    return false;
  }
  function extractPartialSigs(input) {
    let pSigs = [];
    if ((input.partialSig || []).length === 0) {
      if (!input.finalScriptSig && !input.finalScriptWitness) return [];
      pSigs = getPsigsFromInputFinalScripts(input);
    } else {
      pSigs = input.partialSig;
    }
    return pSigs.map((p) => p.signature);
  }
  function getPsigsFromInputFinalScripts(input) {
    const scriptItems = !input.finalScriptSig ? [] : decompile(input.finalScriptSig) || [];
    const witnessItems = !input.finalScriptWitness ? [] : decompile(input.finalScriptWitness) || [];
    return scriptItems.concat(witnessItems).filter((item) => {
      return item instanceof Uint8Array && isCanonicalScriptSignature(item);
    }).map((sig) => ({ signature: sig }));
  }

  // node_modules/bitcoinjs-lib/src/esm/psbt/bip371.js
  var toXOnly = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
  function tapScriptFinalizer(inputIndex, input, tapLeafHashToFinalize) {
    const tapLeaf = findTapLeafToFinalize(
      input,
      inputIndex,
      tapLeafHashToFinalize
    );
    try {
      const sigs = sortSignatures(input, tapLeaf);
      const witness = sigs.concat(tapLeaf.script).concat(tapLeaf.controlBlock);
      return { finalScriptWitness: witnessStackToScriptWitness(witness) };
    } catch (err) {
      throw new Error(`Can not finalize taproot input #${inputIndex}: ${err}`);
    }
  }
  function serializeTaprootSignature(sig, sighashType) {
    const sighashTypeByte = sighashType ? Uint8Array.from([sighashType]) : Uint8Array.from([]);
    return concat([sig, sighashTypeByte]);
  }
  function isTaprootInput(input) {
    return input && !!(input.tapInternalKey || input.tapMerkleRoot || input.tapLeafScript && input.tapLeafScript.length || input.tapBip32Derivation && input.tapBip32Derivation.length || input.witnessUtxo && isP2TR(input.witnessUtxo.script));
  }
  function isTaprootOutput(output, script) {
    return output && !!(output.tapInternalKey || output.tapTree || output.tapBip32Derivation && output.tapBip32Derivation.length || script && isP2TR(script));
  }
  function checkTaprootInputFields(inputData, newInputData, action) {
    checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action);
    checkIfTapLeafInTree(inputData, newInputData, action);
  }
  function checkTaprootOutputFields(outputData, newOutputData, action) {
    checkMixedTaprootAndNonTaprootOutputFields(outputData, newOutputData, action);
    checkTaprootScriptPubkey(outputData, newOutputData);
  }
  function checkTaprootScriptPubkey(outputData, newOutputData) {
    if (!newOutputData.tapTree && !newOutputData.tapInternalKey) return;
    const tapInternalKey = newOutputData.tapInternalKey || outputData.tapInternalKey;
    const tapTree = newOutputData.tapTree || outputData.tapTree;
    if (tapInternalKey) {
      const { script: scriptPubkey } = outputData;
      const script = getTaprootScripPubkey(tapInternalKey, tapTree);
      if (scriptPubkey && compare(script, scriptPubkey) !== 0)
        throw new Error("Error adding output. Script or address mismatch.");
    }
  }
  function getTaprootScripPubkey(tapInternalKey, tapTree) {
    const scriptTree = tapTree && tapTreeFromList(tapTree.leaves);
    const { output } = p2tr({
      internalPubkey: tapInternalKey,
      scriptTree
    });
    return output;
  }
  function tapTreeFromList(leaves = []) {
    if (leaves.length === 1 && leaves[0].depth === 0)
      return {
        output: leaves[0].script,
        version: leaves[0].leafVersion
      };
    return instertLeavesInTree(leaves);
  }
  function checkTaprootInputForSigs(input, action) {
    const sigs = extractTaprootSigs(input);
    return sigs.some(
      (sig) => signatureBlocksAction(sig, decodeSchnorrSignature, action)
    );
  }
  function decodeSchnorrSignature(signature2) {
    return {
      signature: signature2.slice(0, 64),
      hashType: signature2.slice(64)[0] || Transaction.SIGHASH_DEFAULT
    };
  }
  function extractTaprootSigs(input) {
    const sigs = [];
    if (input.tapKeySig) sigs.push(input.tapKeySig);
    if (input.tapScriptSig)
      sigs.push(...input.tapScriptSig.map((s) => s.signature));
    if (!sigs.length) {
      const finalTapKeySig = getTapKeySigFromWitness(input.finalScriptWitness);
      if (finalTapKeySig) sigs.push(finalTapKeySig);
    }
    return sigs;
  }
  function getTapKeySigFromWitness(finalScriptWitness) {
    if (!finalScriptWitness) return;
    const witness = finalScriptWitness.slice(2);
    if (witness.length === 64 || witness.length === 65) return witness;
  }
  function instertLeavesInTree(leaves) {
    let tree;
    for (const leaf of leaves) {
      tree = instertLeafInTree(leaf, tree);
      if (!tree) throw new Error(`No room left to insert tapleaf in tree`);
    }
    return tree;
  }
  function instertLeafInTree(leaf, tree, depth = 0) {
    if (depth > MAX_TAPTREE_DEPTH) throw new Error("Max taptree depth exceeded.");
    if (leaf.depth === depth) {
      if (!tree)
        return {
          output: leaf.script,
          version: leaf.leafVersion
        };
      return;
    }
    if (isTapleaf(tree)) return;
    const leftSide = instertLeafInTree(leaf, tree && tree[0], depth + 1);
    if (leftSide) return [leftSide, tree && tree[1]];
    const rightSide = instertLeafInTree(leaf, tree && tree[1], depth + 1);
    if (rightSide) return [tree && tree[0], rightSide];
  }
  function checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action) {
    const isBadTaprootUpdate = isTaprootInput(inputData) && hasNonTaprootFields(newInputData);
    const isBadNonTaprootUpdate = hasNonTaprootFields(inputData) && isTaprootInput(newInputData);
    const hasMixedFields = inputData === newInputData && isTaprootInput(newInputData) && hasNonTaprootFields(newInputData);
    if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
      throw new Error(
        `Invalid arguments for Psbt.${action}. Cannot use both taproot and non-taproot fields.`
      );
  }
  function checkMixedTaprootAndNonTaprootOutputFields(inputData, newInputData, action) {
    const isBadTaprootUpdate = isTaprootOutput(inputData) && hasNonTaprootFields(newInputData);
    const isBadNonTaprootUpdate = hasNonTaprootFields(inputData) && isTaprootOutput(newInputData);
    const hasMixedFields = inputData === newInputData && isTaprootOutput(newInputData) && hasNonTaprootFields(newInputData);
    if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
      throw new Error(
        `Invalid arguments for Psbt.${action}. Cannot use both taproot and non-taproot fields.`
      );
  }
  function checkIfTapLeafInTree(inputData, newInputData, action) {
    if (newInputData.tapMerkleRoot) {
      const newLeafsInTree = (newInputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, newInputData.tapMerkleRoot)
      );
      const oldLeafsInTree = (inputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, newInputData.tapMerkleRoot)
      );
      if (!newLeafsInTree || !oldLeafsInTree)
        throw new Error(
          `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`
        );
    } else if (inputData.tapMerkleRoot) {
      const newLeafsInTree = (newInputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, inputData.tapMerkleRoot)
      );
      if (!newLeafsInTree)
        throw new Error(
          `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`
        );
    }
  }
  function isTapLeafInTree(tapLeaf, merkleRoot) {
    if (!merkleRoot) return true;
    const leafHash = tapleafHash({
      output: tapLeaf.script,
      version: tapLeaf.leafVersion
    });
    const rootHash = rootHashFromPath(tapLeaf.controlBlock, leafHash);
    return compare(rootHash, merkleRoot) === 0;
  }
  function sortSignatures(input, tapLeaf) {
    const leafHash = tapleafHash({
      output: tapLeaf.script,
      version: tapLeaf.leafVersion
    });
    return (input.tapScriptSig || []).filter((tss) => compare(tss.leafHash, leafHash) === 0).map((tss) => addPubkeyPositionInScript(tapLeaf.script, tss)).sort((t1, t2) => t2.positionInScript - t1.positionInScript).map((t) => t.signature);
  }
  function addPubkeyPositionInScript(script, tss) {
    return Object.assign(
      {
        positionInScript: pubkeyPositionInScript(tss.pubkey, script)
      },
      tss
    );
  }
  function findTapLeafToFinalize(input, inputIndex, leafHashToFinalize) {
    if (!input.tapScriptSig || !input.tapScriptSig.length)
      throw new Error(
        `Can not finalize taproot input #${inputIndex}. No tapleaf script signature provided.`
      );
    const tapLeaf = (input.tapLeafScript || []).sort((a, b) => a.controlBlock.length - b.controlBlock.length).find(
      (leaf) => canFinalizeLeaf(leaf, input.tapScriptSig, leafHashToFinalize)
    );
    if (!tapLeaf)
      throw new Error(
        `Can not finalize taproot input #${inputIndex}. Signature for tapleaf script not found.`
      );
    return tapLeaf;
  }
  function canFinalizeLeaf(leaf, tapScriptSig, hash) {
    const leafHash = tapleafHash({
      output: leaf.script,
      version: leaf.leafVersion
    });
    const whiteListedHash = !hash || compare(leafHash, hash) === 0;
    return whiteListedHash && tapScriptSig.find((tss) => compare(tss.leafHash, leafHash) === 0) !== void 0;
  }
  function hasNonTaprootFields(io) {
    return io && !!(io.redeemScript || io.witnessScript || io.bip32Derivation && io.bip32Derivation.length);
  }

  // node_modules/bitcoinjs-lib/src/esm/psbt.js
  var DEFAULT_OPTS = {
    /**
     * A bitcoinjs Network object. This is only used if you pass an `address`
     * parameter to addOutput. Otherwise it is not needed and can be left default.
     */
    network: bitcoin,
    /**
     * When extractTransaction is called, the fee rate is checked.
     * THIS IS NOT TO BE RELIED ON.
     * It is only here as a last ditch effort to prevent sending a 500 BTC fee etc.
     */
    maximumFeeRate: 5e3
    // satoshi per byte
  };
  var Psbt2 = class _Psbt {
    constructor(opts = {}, data = new Psbt(new PsbtTransaction())) {
      __publicField(this, "data");
      __publicField(this, "__CACHE");
      __publicField(this, "opts");
      this.data = data;
      this.opts = Object.assign({}, DEFAULT_OPTS, opts);
      this.__CACHE = {
        __NON_WITNESS_UTXO_TX_CACHE: [],
        __NON_WITNESS_UTXO_BUF_CACHE: [],
        __TX_IN_CACHE: {},
        __TX: this.data.globalMap.unsignedTx.tx,
        // Psbt's predecessor (TransactionBuilder - now removed) behavior
        // was to not confirm input values  before signing.
        // Even though we highly encourage people to get
        // the full parent transaction to verify values, the ability to
        // sign non-segwit inputs without the full transaction was often
        // requested. So the only way to activate is to use @ts-ignore.
        // We will disable exporting the Psbt when unsafe sign is active.
        // because it is not BIP174 compliant.
        __UNSAFE_SIGN_NONSEGWIT: false
      };
      if (this.data.inputs.length === 0) this.setVersion(2);
      const dpew = (obj, attr, enumerable, writable) => Object.defineProperty(obj, attr, {
        enumerable,
        writable
      });
      dpew(this, "__CACHE", false, true);
      dpew(this, "opts", false, true);
    }
    static fromBase64(data, opts = {}) {
      const buffer = fromBase64(data);
      return this.fromBuffer(buffer, opts);
    }
    static fromHex(data, opts = {}) {
      const buffer = fromHex(data);
      return this.fromBuffer(buffer, opts);
    }
    static fromBuffer(buffer, opts = {}) {
      const psbtBase = Psbt.fromBuffer(buffer, transactionFromBuffer);
      const psbt = new _Psbt(opts, psbtBase);
      checkTxForDupeIns(psbt.__CACHE.__TX, psbt.__CACHE);
      return psbt;
    }
    get inputCount() {
      return this.data.inputs.length;
    }
    get version() {
      return this.__CACHE.__TX.version;
    }
    set version(version) {
      this.setVersion(version);
    }
    get locktime() {
      return this.__CACHE.__TX.locktime;
    }
    set locktime(locktime) {
      this.setLocktime(locktime);
    }
    get txInputs() {
      return this.__CACHE.__TX.ins.map((input) => ({
        hash: cloneBuffer(input.hash),
        index: input.index,
        sequence: input.sequence
      }));
    }
    get txOutputs() {
      return this.__CACHE.__TX.outs.map((output) => {
        let address;
        try {
          address = fromOutputScript(output.script, this.opts.network);
        } catch (_) {
        }
        return {
          script: cloneBuffer(output.script),
          value: output.value,
          address
        };
      });
    }
    combine(...those) {
      this.data.combine(...those.map((o) => o.data));
      return this;
    }
    clone() {
      const res = _Psbt.fromBuffer(this.data.toBuffer());
      res.opts = JSON.parse(JSON.stringify(this.opts));
      return res;
    }
    setMaximumFeeRate(satoshiPerByte) {
      check32Bit(satoshiPerByte);
      this.opts.maximumFeeRate = satoshiPerByte;
    }
    setVersion(version) {
      check32Bit(version);
      checkInputsForPartialSig(this.data.inputs, "setVersion");
      const c = this.__CACHE;
      c.__TX.version = version;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    setLocktime(locktime) {
      check32Bit(locktime);
      checkInputsForPartialSig(this.data.inputs, "setLocktime");
      const c = this.__CACHE;
      c.__TX.locktime = locktime;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    setInputSequence(inputIndex, sequence) {
      check32Bit(sequence);
      checkInputsForPartialSig(this.data.inputs, "setInputSequence");
      const c = this.__CACHE;
      if (c.__TX.ins.length <= inputIndex) {
        throw new Error("Input index too high");
      }
      c.__TX.ins[inputIndex].sequence = sequence;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    addInputs(inputDatas) {
      inputDatas.forEach((inputData) => this.addInput(inputData));
      return this;
    }
    addInput(inputData) {
      if (arguments.length > 1 || !inputData || inputData.hash === void 0 || inputData.index === void 0) {
        throw new Error(
          `Invalid arguments for Psbt.addInput. Requires single object with at least [hash] and [index]`
        );
      }
      checkTaprootInputFields(inputData, inputData, "addInput");
      checkInputsForPartialSig(this.data.inputs, "addInput");
      if (inputData.witnessScript) checkInvalidP2WSH(inputData.witnessScript);
      const c = this.__CACHE;
      this.data.addInput(inputData);
      const txIn = c.__TX.ins[c.__TX.ins.length - 1];
      checkTxInputCache(c, txIn);
      const inputIndex = this.data.inputs.length - 1;
      const input = this.data.inputs[inputIndex];
      if (input.nonWitnessUtxo) {
        addNonWitnessTxCache(this.__CACHE, input, inputIndex);
      }
      c.__FEE = void 0;
      c.__FEE_RATE = void 0;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    addOutputs(outputDatas) {
      outputDatas.forEach((outputData) => this.addOutput(outputData));
      return this;
    }
    addOutput(outputData) {
      if (arguments.length > 1 || !outputData || outputData.value === void 0 || outputData.address === void 0 && outputData.script === void 0) {
        throw new Error(
          `Invalid arguments for Psbt.addOutput. Requires single object with at least [script or address] and [value]`
        );
      }
      checkInputsForPartialSig(this.data.inputs, "addOutput");
      const { address } = outputData;
      if (typeof address === "string") {
        const { network } = this.opts;
        const script = toOutputScript(address, network);
        outputData = Object.assign({}, outputData, { script });
      }
      checkTaprootOutputFields(outputData, outputData, "addOutput");
      const c = this.__CACHE;
      this.data.addOutput(outputData);
      c.__FEE = void 0;
      c.__FEE_RATE = void 0;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    extractTransaction(disableFeeCheck) {
      if (!this.data.inputs.every(isFinalized)) throw new Error("Not finalized");
      const c = this.__CACHE;
      if (!disableFeeCheck) {
        checkFees(this, c, this.opts);
      }
      if (c.__EXTRACTED_TX) return c.__EXTRACTED_TX;
      const tx = c.__TX.clone();
      inputFinalizeGetAmts(this.data.inputs, tx, c, true);
      return tx;
    }
    getFeeRate() {
      return getTxCacheValue(
        "__FEE_RATE",
        "fee rate",
        this.data.inputs,
        this.__CACHE
      );
    }
    getFee() {
      return getTxCacheValue("__FEE", "fee", this.data.inputs, this.__CACHE);
    }
    finalizeAllInputs() {
      checkForInput(this.data.inputs, 0);
      range4(this.data.inputs.length).forEach((idx) => this.finalizeInput(idx));
      return this;
    }
    finalizeInput(inputIndex, finalScriptsFunc) {
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._finalizeTaprootInput(
          inputIndex,
          input,
          void 0,
          finalScriptsFunc
        );
      return this._finalizeInput(inputIndex, input, finalScriptsFunc);
    }
    finalizeTaprootInput(inputIndex, tapLeafHashToFinalize, finalScriptsFunc = tapScriptFinalizer) {
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._finalizeTaprootInput(
          inputIndex,
          input,
          tapLeafHashToFinalize,
          finalScriptsFunc
        );
      throw new Error(`Cannot finalize input #${inputIndex}. Not Taproot.`);
    }
    _finalizeInput(inputIndex, input, finalScriptsFunc = getFinalScripts) {
      const { script, isP2SH, isP2WSH, isSegwit } = getScriptFromInput(
        inputIndex,
        input,
        this.__CACHE
      );
      if (!script) throw new Error(`No script found for input #${inputIndex}`);
      checkPartialSigSighashes(input);
      const { finalScriptSig, finalScriptWitness } = finalScriptsFunc(
        inputIndex,
        input,
        script,
        isSegwit,
        isP2SH,
        isP2WSH
      );
      if (finalScriptSig) this.data.updateInput(inputIndex, { finalScriptSig });
      if (finalScriptWitness)
        this.data.updateInput(inputIndex, { finalScriptWitness });
      if (!finalScriptSig && !finalScriptWitness)
        throw new Error(`Unknown error finalizing input #${inputIndex}`);
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
    _finalizeTaprootInput(inputIndex, input, tapLeafHashToFinalize, finalScriptsFunc = tapScriptFinalizer) {
      if (!input.witnessUtxo)
        throw new Error(
          `Cannot finalize input #${inputIndex}. Missing withness utxo.`
        );
      if (input.tapKeySig) {
        const payment = p2tr({
          output: input.witnessUtxo.script,
          signature: input.tapKeySig
        });
        const finalScriptWitness = witnessStackToScriptWitness(payment.witness);
        this.data.updateInput(inputIndex, { finalScriptWitness });
      } else {
        const { finalScriptWitness } = finalScriptsFunc(
          inputIndex,
          input,
          tapLeafHashToFinalize
        );
        this.data.updateInput(inputIndex, { finalScriptWitness });
      }
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
    getInputType(inputIndex) {
      const input = checkForInput(this.data.inputs, inputIndex);
      const script = getScriptFromUtxo(inputIndex, input, this.__CACHE);
      const result = getMeaningfulScript(
        script,
        inputIndex,
        "input",
        input.redeemScript || redeemFromFinalScriptSig(input.finalScriptSig),
        input.witnessScript || redeemFromFinalWitnessScript(input.finalScriptWitness)
      );
      const type = result.type === "raw" ? "" : result.type + "-";
      const mainType = classifyScript(result.meaningfulScript);
      return type + mainType;
    }
    inputHasPubkey(inputIndex, pubkey) {
      const input = checkForInput(this.data.inputs, inputIndex);
      return pubkeyInInput(pubkey, input, inputIndex, this.__CACHE);
    }
    inputHasHDKey(inputIndex, root) {
      const input = checkForInput(this.data.inputs, inputIndex);
      const derivationIsMine = bip32DerivationIsMine(root);
      return !!input.bip32Derivation && input.bip32Derivation.some(derivationIsMine);
    }
    outputHasPubkey(outputIndex, pubkey) {
      const output = checkForOutput(this.data.outputs, outputIndex);
      return pubkeyInOutput(pubkey, output, outputIndex, this.__CACHE);
    }
    outputHasHDKey(outputIndex, root) {
      const output = checkForOutput(this.data.outputs, outputIndex);
      const derivationIsMine = bip32DerivationIsMine(root);
      return !!output.bip32Derivation && output.bip32Derivation.some(derivationIsMine);
    }
    validateSignaturesOfAllInputs(validator) {
      checkForInput(this.data.inputs, 0);
      const results = range4(this.data.inputs.length).map(
        (idx) => this.validateSignaturesOfInput(idx, validator)
      );
      return results.reduce((final, res) => res === true && final, true);
    }
    validateSignaturesOfInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      if (isTaprootInput(input))
        return this.validateSignaturesOfTaprootInput(
          inputIndex,
          validator,
          pubkey
        );
      return this._validateSignaturesOfInput(inputIndex, validator, pubkey);
    }
    _validateSignaturesOfInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      const partialSig = (input || {}).partialSig;
      if (!input || !partialSig || partialSig.length < 1)
        throw new Error("No signatures to validate");
      if (typeof validator !== "function")
        throw new Error("Need validator function to validate signatures");
      const mySigs = pubkey ? partialSig.filter((sig) => compare(sig.pubkey, pubkey) === 0) : partialSig;
      if (mySigs.length < 1) throw new Error("No signatures for this pubkey");
      const results = [];
      let hashCache;
      let scriptCache;
      let sighashCache;
      for (const pSig of mySigs) {
        const sig = signature.decode(pSig.signature);
        const { hash, script } = sighashCache !== sig.hashType ? getHashForSig(
          inputIndex,
          Object.assign({}, input, { sighashType: sig.hashType }),
          this.__CACHE,
          true
        ) : { hash: hashCache, script: scriptCache };
        sighashCache = sig.hashType;
        hashCache = hash;
        scriptCache = script;
        checkScriptForPubkey(pSig.pubkey, script, "verify");
        results.push(validator(pSig.pubkey, hash, sig.signature));
      }
      return results.every((res) => res === true);
    }
    validateSignaturesOfTaprootInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      const tapKeySig = (input || {}).tapKeySig;
      const tapScriptSig = (input || {}).tapScriptSig;
      if (!input && !tapKeySig && !(tapScriptSig && !tapScriptSig.length))
        throw new Error("No signatures to validate");
      if (typeof validator !== "function")
        throw new Error("Need validator function to validate signatures");
      pubkey = pubkey && toXOnly(pubkey);
      const allHashses = pubkey ? getTaprootHashesForSigValidation(
        inputIndex,
        input,
        this.data.inputs,
        pubkey,
        this.__CACHE
      ) : getAllTaprootHashesForSigValidation(
        inputIndex,
        input,
        this.data.inputs,
        this.__CACHE
      );
      if (!allHashses.length) throw new Error("No signatures for this pubkey");
      const tapKeyHash = allHashses.find((h2) => !h2.leafHash);
      let validationResultCount = 0;
      if (tapKeySig && tapKeyHash) {
        const isValidTapkeySig = validator(
          tapKeyHash.pubkey,
          tapKeyHash.hash,
          trimTaprootSig(tapKeySig)
        );
        if (!isValidTapkeySig) return false;
        validationResultCount++;
      }
      if (tapScriptSig) {
        for (const tapSig of tapScriptSig) {
          const tapSigHash = allHashses.find(
            (h2) => compare(h2.pubkey, tapSig.pubkey) === 0
          );
          if (tapSigHash) {
            const isValidTapScriptSig = validator(
              tapSig.pubkey,
              tapSigHash.hash,
              trimTaprootSig(tapSig.signature)
            );
            if (!isValidTapScriptSig) return false;
            validationResultCount++;
          }
        }
      }
      return validationResultCount > 0;
    }
    signAllInputsHD(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
        throw new Error("Need HDSigner to sign input");
      }
      const results = [];
      for (const i of range4(this.data.inputs.length)) {
        try {
          this.signInputHD(i, hdKeyPair, sighashTypes);
          results.push(true);
        } catch (err) {
          results.push(false);
        }
      }
      if (results.every((v) => v === false)) {
        throw new Error("No inputs were signed");
      }
      return this;
    }
    signAllInputsHDAsync(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      return new Promise((resolve, reject) => {
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
          return reject(new Error("Need HDSigner to sign input"));
        }
        const results = [];
        const promises = [];
        for (const i of range4(this.data.inputs.length)) {
          promises.push(
            this.signInputHDAsync(i, hdKeyPair, sighashTypes).then(
              () => {
                results.push(true);
              },
              () => {
                results.push(false);
              }
            )
          );
        }
        return Promise.all(promises).then(() => {
          if (results.every((v) => v === false)) {
            return reject(new Error("No inputs were signed"));
          }
          resolve();
        });
      });
    }
    signInputHD(inputIndex, hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
        throw new Error("Need HDSigner to sign input");
      }
      const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
      signers.forEach((signer) => this.signInput(inputIndex, signer, sighashTypes));
      return this;
    }
    signInputHDAsync(inputIndex, hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      return new Promise((resolve, reject) => {
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
          return reject(new Error("Need HDSigner to sign input"));
        }
        const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
        const promises = signers.map(
          (signer) => this.signInputAsync(inputIndex, signer, sighashTypes)
        );
        return Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    signAllInputs(keyPair, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const results = [];
      for (const i of range4(this.data.inputs.length)) {
        try {
          this.signInput(i, keyPair, sighashTypes);
          results.push(true);
        } catch (err) {
          results.push(false);
        }
      }
      if (results.every((v) => v === false)) {
        throw new Error("No inputs were signed");
      }
      return this;
    }
    signAllInputsAsync(keyPair, sighashTypes) {
      return new Promise((resolve, reject) => {
        if (!keyPair || !keyPair.publicKey)
          return reject(new Error("Need Signer to sign input"));
        const results = [];
        const promises = [];
        for (const [i] of this.data.inputs.entries()) {
          promises.push(
            this.signInputAsync(i, keyPair, sighashTypes).then(
              () => {
                results.push(true);
              },
              () => {
                results.push(false);
              }
            )
          );
        }
        return Promise.all(promises).then(() => {
          if (results.every((v) => v === false)) {
            return reject(new Error("No inputs were signed"));
          }
          resolve();
        });
      });
    }
    signInput(inputIndex, keyPair, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input)) {
        return this._signTaprootInput(
          inputIndex,
          input,
          keyPair,
          void 0,
          sighashTypes
        );
      }
      return this._signInput(inputIndex, keyPair, sighashTypes);
    }
    signTaprootInput(inputIndex, keyPair, tapLeafHashToSign, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._signTaprootInput(
          inputIndex,
          input,
          keyPair,
          tapLeafHashToSign,
          sighashTypes
        );
      throw new Error(`Input #${inputIndex} is not of type Taproot.`);
    }
    _signInput(inputIndex, keyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      const { hash, sighashType } = getHashAndSighashType(
        this.data.inputs,
        inputIndex,
        keyPair.publicKey,
        this.__CACHE,
        sighashTypes
      );
      const partialSig = [
        {
          pubkey: keyPair.publicKey,
          signature: signature.encode(keyPair.sign(hash), sighashType)
        }
      ];
      this.data.updateInput(inputIndex, { partialSig });
      return this;
    }
    _signTaprootInput(inputIndex, input, keyPair, tapLeafHashToSign, allowedSighashTypes = [Transaction.SIGHASH_DEFAULT]) {
      const hashesForSig = this.checkTaprootHashesForSig(
        inputIndex,
        input,
        keyPair,
        tapLeafHashToSign,
        allowedSighashTypes
      );
      const tapKeySig = hashesForSig.filter((h2) => !h2.leafHash).map(
        (h2) => serializeTaprootSignature(
          keyPair.signSchnorr(h2.hash),
          input.sighashType
        )
      )[0];
      const tapScriptSig = hashesForSig.filter((h2) => !!h2.leafHash).map((h2) => ({
        pubkey: toXOnly(keyPair.publicKey),
        signature: serializeTaprootSignature(
          keyPair.signSchnorr(h2.hash),
          input.sighashType
        ),
        leafHash: h2.leafHash
      }));
      if (tapKeySig) {
        this.data.updateInput(inputIndex, { tapKeySig });
      }
      if (tapScriptSig.length) {
        this.data.updateInput(inputIndex, { tapScriptSig });
      }
      return this;
    }
    signInputAsync(inputIndex, keyPair, sighashTypes) {
      return Promise.resolve().then(() => {
        if (!keyPair || !keyPair.publicKey)
          throw new Error("Need Signer to sign input");
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
          return this._signTaprootInputAsync(
            inputIndex,
            input,
            keyPair,
            void 0,
            sighashTypes
          );
        return this._signInputAsync(inputIndex, keyPair, sighashTypes);
      });
    }
    signTaprootInputAsync(inputIndex, keyPair, tapLeafHash, sighashTypes) {
      return Promise.resolve().then(() => {
        if (!keyPair || !keyPair.publicKey)
          throw new Error("Need Signer to sign input");
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
          return this._signTaprootInputAsync(
            inputIndex,
            input,
            keyPair,
            tapLeafHash,
            sighashTypes
          );
        throw new Error(`Input #${inputIndex} is not of type Taproot.`);
      });
    }
    _signInputAsync(inputIndex, keyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      const { hash, sighashType } = getHashAndSighashType(
        this.data.inputs,
        inputIndex,
        keyPair.publicKey,
        this.__CACHE,
        sighashTypes
      );
      return Promise.resolve(keyPair.sign(hash)).then((signature2) => {
        const partialSig = [
          {
            pubkey: keyPair.publicKey,
            signature: signature.encode(signature2, sighashType)
          }
        ];
        this.data.updateInput(inputIndex, { partialSig });
      });
    }
    async _signTaprootInputAsync(inputIndex, input, keyPair, tapLeafHash, sighashTypes = [Transaction.SIGHASH_DEFAULT]) {
      const hashesForSig = this.checkTaprootHashesForSig(
        inputIndex,
        input,
        keyPair,
        tapLeafHash,
        sighashTypes
      );
      const signaturePromises = [];
      const tapKeyHash = hashesForSig.filter((h2) => !h2.leafHash)[0];
      if (tapKeyHash) {
        const tapKeySigPromise = Promise.resolve(
          keyPair.signSchnorr(tapKeyHash.hash)
        ).then((sig) => {
          return { tapKeySig: serializeTaprootSignature(sig, input.sighashType) };
        });
        signaturePromises.push(tapKeySigPromise);
      }
      const tapScriptHashes = hashesForSig.filter((h2) => !!h2.leafHash);
      if (tapScriptHashes.length) {
        const tapScriptSigPromises = tapScriptHashes.map((tsh) => {
          return Promise.resolve(keyPair.signSchnorr(tsh.hash)).then(
            (signature2) => {
              const tapScriptSig = [
                {
                  pubkey: toXOnly(keyPair.publicKey),
                  signature: serializeTaprootSignature(
                    signature2,
                    input.sighashType
                  ),
                  leafHash: tsh.leafHash
                }
              ];
              return { tapScriptSig };
            }
          );
        });
        signaturePromises.push(...tapScriptSigPromises);
      }
      return Promise.all(signaturePromises).then((results) => {
        results.forEach((v) => this.data.updateInput(inputIndex, v));
      });
    }
    checkTaprootHashesForSig(inputIndex, input, keyPair, tapLeafHashToSign, allowedSighashTypes) {
      if (typeof keyPair.signSchnorr !== "function")
        throw new Error(
          `Need Schnorr Signer to sign taproot input #${inputIndex}.`
        );
      const hashesForSig = getTaprootHashesForSigning(
        inputIndex,
        input,
        this.data.inputs,
        keyPair.publicKey,
        this.__CACHE,
        tapLeafHashToSign,
        allowedSighashTypes
      );
      if (!hashesForSig || !hashesForSig.length)
        throw new Error(
          `Can not sign for input #${inputIndex} with the key ${toHex(keyPair.publicKey)}`
        );
      return hashesForSig;
    }
    toBuffer() {
      checkCache(this.__CACHE);
      return this.data.toBuffer();
    }
    toHex() {
      checkCache(this.__CACHE);
      return this.data.toHex();
    }
    toBase64() {
      checkCache(this.__CACHE);
      return this.data.toBase64();
    }
    updateGlobal(updateData) {
      this.data.updateGlobal(updateData);
      return this;
    }
    updateInput(inputIndex, updateData) {
      if (updateData.witnessScript) checkInvalidP2WSH(updateData.witnessScript);
      checkTaprootInputFields(
        this.data.inputs[inputIndex],
        updateData,
        "updateInput"
      );
      this.data.updateInput(inputIndex, updateData);
      if (updateData.nonWitnessUtxo) {
        addNonWitnessTxCache(
          this.__CACHE,
          this.data.inputs[inputIndex],
          inputIndex
        );
      }
      return this;
    }
    updateOutput(outputIndex, updateData) {
      const outputData = this.data.outputs[outputIndex];
      checkTaprootOutputFields(outputData, updateData, "updateOutput");
      this.data.updateOutput(outputIndex, updateData);
      return this;
    }
    addUnknownKeyValToGlobal(keyVal) {
      this.data.addUnknownKeyValToGlobal(keyVal);
      return this;
    }
    addUnknownKeyValToInput(inputIndex, keyVal) {
      this.data.addUnknownKeyValToInput(inputIndex, keyVal);
      return this;
    }
    addUnknownKeyValToOutput(outputIndex, keyVal) {
      this.data.addUnknownKeyValToOutput(outputIndex, keyVal);
      return this;
    }
    clearFinalizedInput(inputIndex) {
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
  };
  var transactionFromBuffer = (buffer) => new PsbtTransaction(buffer);
  var PsbtTransaction = class {
    constructor(buffer = Uint8Array.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])) {
      __publicField(this, "tx");
      this.tx = Transaction.fromBuffer(buffer);
      checkTxEmpty(this.tx);
      Object.defineProperty(this, "tx", {
        enumerable: false,
        writable: true
      });
    }
    getInputOutputCounts() {
      return {
        inputCount: this.tx.ins.length,
        outputCount: this.tx.outs.length
      };
    }
    addInput(input) {
      if (input.hash === void 0 || input.index === void 0 || !(input.hash instanceof Uint8Array) && typeof input.hash !== "string" || typeof input.index !== "number") {
        throw new Error("Error adding input.");
      }
      const hash = typeof input.hash === "string" ? reverseBuffer(fromHex(input.hash)) : input.hash;
      this.tx.addInput(hash, input.index, input.sequence);
    }
    addOutput(output) {
      if (output.script === void 0 || output.value === void 0 || !(output.script instanceof Uint8Array) || typeof output.value !== "bigint") {
        throw new Error("Error adding output.");
      }
      this.tx.addOutput(output.script, output.value);
    }
    toBuffer() {
      return this.tx.toBuffer();
    }
  };
  function canFinalize(input, script, scriptType) {
    switch (scriptType) {
      case "pubkey":
      case "pubkeyhash":
      case "witnesspubkeyhash":
        return hasSigs(1, input.partialSig);
      case "multisig":
        const p2ms2 = p2ms({ output: script });
        return hasSigs(p2ms2.m, input.partialSig, p2ms2.pubkeys);
      default:
        return false;
    }
  }
  function checkCache(cache) {
    if (cache.__UNSAFE_SIGN_NONSEGWIT !== false) {
      throw new Error("Not BIP174 compliant, can not export");
    }
  }
  function hasSigs(neededSigs, partialSig, pubkeys) {
    if (!partialSig) return false;
    let sigs;
    if (pubkeys) {
      sigs = pubkeys.map((pkey) => {
        const pubkey = compressPubkey(pkey);
        return partialSig.find(
          (pSig) => compare(pSig.pubkey, pubkey) === 0
        );
      }).filter((v) => !!v);
    } else {
      sigs = partialSig;
    }
    if (sigs.length > neededSigs) throw new Error("Too many signatures");
    return sigs.length === neededSigs;
  }
  function isFinalized(input) {
    return !!input.finalScriptSig || !!input.finalScriptWitness;
  }
  function bip32DerivationIsMine(root) {
    return (d) => {
      if (compare(root.fingerprint, d.masterFingerprint)) return false;
      if (compare(root.derivePath(d.path).publicKey, d.pubkey))
        return false;
      return true;
    };
  }
  function check32Bit(num2) {
    if (typeof num2 !== "number" || num2 !== Math.floor(num2) || num2 > 4294967295 || num2 < 0) {
      throw new Error("Invalid 32 bit integer");
    }
  }
  function checkFees(psbt, cache, opts) {
    const feeRate = cache.__FEE_RATE || psbt.getFeeRate();
    const vsize = cache.__EXTRACTED_TX.virtualSize();
    const satoshis = feeRate * vsize;
    if (feeRate >= opts.maximumFeeRate) {
      throw new Error(
        `Warning: You are paying around ${(satoshis / 1e8).toFixed(8)} in fees, which is ${feeRate} satoshi per byte for a transaction with a VSize of ${vsize} bytes (segwit counted as 0.25 byte per byte). Use setMaximumFeeRate method to raise your threshold, or pass true to the first arg of extractTransaction.`
      );
    }
  }
  function checkInputsForPartialSig(inputs2, action) {
    inputs2.forEach((input) => {
      const throws = isTaprootInput(input) ? checkTaprootInputForSigs(input, action) : checkInputForSig(input, action);
      if (throws)
        throw new Error("Can not modify transaction, signatures exist.");
    });
  }
  function checkPartialSigSighashes(input) {
    if (!input.sighashType || !input.partialSig) return;
    const { partialSig, sighashType } = input;
    partialSig.forEach((pSig) => {
      const { hashType } = signature.decode(pSig.signature);
      if (sighashType !== hashType) {
        throw new Error("Signature sighash does not match input sighash type");
      }
    });
  }
  function checkScriptForPubkey(pubkey, script, action) {
    if (!pubkeyInScript(pubkey, script)) {
      throw new Error(
        `Can not ${action} for this input with the key ${toHex(pubkey)}`
      );
    }
  }
  function checkTxEmpty(tx) {
    const isEmpty = tx.ins.every(
      (input) => input.script && input.script.length === 0 && input.witness && input.witness.length === 0
    );
    if (!isEmpty) {
      throw new Error("Format Error: Transaction ScriptSigs are not empty");
    }
  }
  function checkTxForDupeIns(tx, cache) {
    tx.ins.forEach((input) => {
      checkTxInputCache(cache, input);
    });
  }
  function checkTxInputCache(cache, input) {
    const key = toHex(reverseBuffer(Uint8Array.from(input.hash))) + ":" + input.index;
    if (cache.__TX_IN_CACHE[key]) throw new Error("Duplicate input detected.");
    cache.__TX_IN_CACHE[key] = 1;
  }
  function scriptCheckerFactory(payment, paymentScriptName) {
    return (inputIndex, scriptPubKey, redeemScript, ioType) => {
      const redeemScriptOutput = payment({
        redeem: { output: redeemScript }
      }).output;
      if (compare(scriptPubKey, redeemScriptOutput)) {
        throw new Error(
          `${paymentScriptName} for ${ioType} #${inputIndex} doesn't match the scriptPubKey in the prevout`
        );
      }
    };
  }
  var checkRedeemScript = scriptCheckerFactory(p2sh, "Redeem script");
  var checkWitnessScript = scriptCheckerFactory(
    p2wsh,
    "Witness script"
  );
  function getTxCacheValue(key, name, inputs2, c) {
    if (!inputs2.every(isFinalized))
      throw new Error(`PSBT must be finalized to calculate ${name}`);
    if (key === "__FEE_RATE" && c.__FEE_RATE) return c.__FEE_RATE;
    if (key === "__FEE" && c.__FEE) return c.__FEE;
    let tx;
    let mustFinalize = true;
    if (c.__EXTRACTED_TX) {
      tx = c.__EXTRACTED_TX;
      mustFinalize = false;
    } else {
      tx = c.__TX.clone();
    }
    inputFinalizeGetAmts(inputs2, tx, c, mustFinalize);
    if (key === "__FEE_RATE") return c.__FEE_RATE;
    else if (key === "__FEE") return c.__FEE;
  }
  function getFinalScripts(inputIndex, input, script, isSegwit, isP2SH, isP2WSH) {
    const scriptType = classifyScript(script);
    if (!canFinalize(input, script, scriptType))
      throw new Error(`Can not finalize input #${inputIndex}`);
    return prepareFinalScripts(
      script,
      scriptType,
      input.partialSig,
      isSegwit,
      isP2SH,
      isP2WSH
    );
  }
  function prepareFinalScripts(script, scriptType, partialSig, isSegwit, isP2SH, isP2WSH) {
    let finalScriptSig;
    let finalScriptWitness;
    const payment = getPayment(script, scriptType, partialSig);
    const p2wsh2 = !isP2WSH ? null : p2wsh({ redeem: payment });
    const p2sh2 = !isP2SH ? null : p2sh({ redeem: p2wsh2 || payment });
    if (isSegwit) {
      if (p2wsh2) {
        finalScriptWitness = witnessStackToScriptWitness(p2wsh2.witness);
      } else {
        finalScriptWitness = witnessStackToScriptWitness(payment.witness);
      }
      if (p2sh2) {
        finalScriptSig = p2sh2.input;
      }
    } else {
      if (p2sh2) {
        finalScriptSig = p2sh2.input;
      } else {
        finalScriptSig = payment.input;
      }
    }
    return {
      finalScriptSig,
      finalScriptWitness
    };
  }
  function getHashAndSighashType(inputs2, inputIndex, pubkey, cache, sighashTypes) {
    const input = checkForInput(inputs2, inputIndex);
    const { hash, sighashType, script } = getHashForSig(
      inputIndex,
      input,
      cache,
      false,
      sighashTypes
    );
    checkScriptForPubkey(pubkey, script, "sign");
    return {
      hash,
      sighashType
    };
  }
  function getHashForSig(inputIndex, input, cache, forValidate, sighashTypes) {
    const unsignedTx = cache.__TX;
    const sighashType = input.sighashType || Transaction.SIGHASH_ALL;
    checkSighashTypeAllowed(sighashType, sighashTypes);
    let hash;
    let prevout;
    if (input.nonWitnessUtxo) {
      const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
        cache,
        input,
        inputIndex
      );
      const prevoutHash = unsignedTx.ins[inputIndex].hash;
      const utxoHash = nonWitnessUtxoTx.getHash();
      if (compare(prevoutHash, utxoHash) !== 0) {
        throw new Error(
          `Non-witness UTXO hash for input #${inputIndex} doesn't match the hash specified in the prevout`
        );
      }
      const prevoutIndex = unsignedTx.ins[inputIndex].index;
      prevout = nonWitnessUtxoTx.outs[prevoutIndex];
    } else if (input.witnessUtxo) {
      prevout = input.witnessUtxo;
    } else {
      throw new Error("Need a Utxo input item for signing");
    }
    const { meaningfulScript, type } = getMeaningfulScript(
      prevout.script,
      inputIndex,
      "input",
      input.redeemScript,
      input.witnessScript
    );
    if (["p2sh-p2wsh", "p2wsh"].indexOf(type) >= 0) {
      hash = unsignedTx.hashForWitnessV0(
        inputIndex,
        meaningfulScript,
        prevout.value,
        sighashType
      );
    } else if (isP2WPKH(meaningfulScript)) {
      const signingScript = p2pkh({
        hash: meaningfulScript.slice(2)
      }).output;
      hash = unsignedTx.hashForWitnessV0(
        inputIndex,
        signingScript,
        prevout.value,
        sighashType
      );
    } else {
      if (input.nonWitnessUtxo === void 0 && cache.__UNSAFE_SIGN_NONSEGWIT === false)
        throw new Error(
          `Input #${inputIndex} has witnessUtxo but non-segwit script: ${toHex(meaningfulScript)}`
        );
      if (!forValidate && cache.__UNSAFE_SIGN_NONSEGWIT !== false)
        console.warn(
          "Warning: Signing non-segwit inputs without the full parent transaction means there is a chance that a miner could feed you incorrect information to trick you into paying large fees. This behavior is the same as Psbt's predecessor (TransactionBuilder - now removed) when signing non-segwit scripts. You are not able to export this Psbt with toBuffer|toBase64|toHex since it is not BIP174 compliant.\n*********************\nPROCEED WITH CAUTION!\n*********************"
        );
      hash = unsignedTx.hashForSignature(
        inputIndex,
        meaningfulScript,
        sighashType
      );
    }
    return {
      script: meaningfulScript,
      sighashType,
      hash
    };
  }
  function getAllTaprootHashesForSigValidation(inputIndex, input, inputs2, cache) {
    const allPublicKeys = [];
    if (input.tapInternalKey) {
      const key = getPrevoutTaprootKey(inputIndex, input, cache);
      if (key) {
        allPublicKeys.push(key);
      }
    }
    if (input.tapScriptSig) {
      const tapScriptPubkeys = input.tapScriptSig.map((tss) => tss.pubkey);
      allPublicKeys.push(...tapScriptPubkeys);
    }
    const allHashes = allPublicKeys.map(
      (publicKey) => getTaprootHashesForSigValidation(
        inputIndex,
        input,
        inputs2,
        publicKey,
        cache
      )
    );
    return allHashes.flat();
  }
  function getPrevoutTaprootKey(inputIndex, input, cache) {
    const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
    return isP2TR(script) ? script.subarray(2, 34) : null;
  }
  function trimTaprootSig(signature2) {
    return signature2.length === 64 ? signature2 : signature2.subarray(0, 64);
  }
  function getTaprootHashesForSigning(inputIndex, input, inputs2, pubkey, cache, tapLeafHashToSign, allowedSighashTypes) {
    const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
    checkSighashTypeAllowed(sighashType, allowedSighashTypes);
    const keySpend = Boolean(input.tapInternalKey && !tapLeafHashToSign);
    return getTaprootHashesForSig(
      inputIndex,
      input,
      inputs2,
      pubkey,
      cache,
      keySpend,
      sighashType,
      tapLeafHashToSign
    );
  }
  function getTaprootHashesForSigValidation(inputIndex, input, inputs2, pubkey, cache) {
    const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
    const keySpend = Boolean(input.tapKeySig);
    return getTaprootHashesForSig(
      inputIndex,
      input,
      inputs2,
      pubkey,
      cache,
      keySpend,
      sighashType
    );
  }
  function getTaprootHashesForSig(inputIndex, input, inputs2, pubkey, cache, keySpend, sighashType, tapLeafHashToSign) {
    const unsignedTx = cache.__TX;
    const prevOuts = inputs2.map(
      (i, index) => getScriptAndAmountFromUtxo(index, i, cache)
    );
    const signingScripts = prevOuts.map((o) => o.script);
    const values = prevOuts.map((o) => o.value);
    const hashes = [];
    if (keySpend) {
      const outputKey = getPrevoutTaprootKey(inputIndex, input, cache) || Uint8Array.from([]);
      if (compare(toXOnly(pubkey), outputKey) === 0) {
        const tapKeyHash = unsignedTx.hashForWitnessV1(
          inputIndex,
          signingScripts,
          values,
          sighashType
        );
        hashes.push({ pubkey, hash: tapKeyHash });
      }
    }
    const tapLeafHashes = (input.tapLeafScript || []).filter((tapLeaf) => pubkeyInScript(pubkey, tapLeaf.script)).map((tapLeaf) => {
      const hash = tapleafHash({
        output: tapLeaf.script,
        version: tapLeaf.leafVersion
      });
      return Object.assign({ hash }, tapLeaf);
    }).filter(
      (tapLeaf) => !tapLeafHashToSign || compare(tapLeafHashToSign, tapLeaf.hash) === 0
    ).map((tapLeaf) => {
      const tapScriptHash = unsignedTx.hashForWitnessV1(
        inputIndex,
        signingScripts,
        values,
        sighashType,
        tapLeaf.hash
      );
      return {
        pubkey,
        hash: tapScriptHash,
        leafHash: tapLeaf.hash
      };
    });
    return hashes.concat(tapLeafHashes);
  }
  function checkSighashTypeAllowed(sighashType, sighashTypes) {
    if (sighashTypes && sighashTypes.indexOf(sighashType) < 0) {
      const str = sighashTypeToString(sighashType);
      throw new Error(
        `Sighash type is not allowed. Retry the sign method passing the sighashTypes array of whitelisted types. Sighash type: ${str}`
      );
    }
  }
  function getPayment(script, scriptType, partialSig) {
    let payment;
    switch (scriptType) {
      case "multisig":
        const sigs = getSortedSigs(script, partialSig);
        payment = p2ms({
          output: script,
          signatures: sigs
        });
        break;
      case "pubkey":
        payment = p2pk({
          output: script,
          signature: partialSig[0].signature
        });
        break;
      case "pubkeyhash":
        payment = p2pkh({
          output: script,
          pubkey: partialSig[0].pubkey,
          signature: partialSig[0].signature
        });
        break;
      case "witnesspubkeyhash":
        payment = p2wpkh({
          output: script,
          pubkey: partialSig[0].pubkey,
          signature: partialSig[0].signature
        });
        break;
    }
    return payment;
  }
  function getScriptFromInput(inputIndex, input, cache) {
    const unsignedTx = cache.__TX;
    const res = {
      script: null,
      isSegwit: false,
      isP2SH: false,
      isP2WSH: false
    };
    res.isP2SH = !!input.redeemScript;
    res.isP2WSH = !!input.witnessScript;
    if (input.witnessScript) {
      res.script = input.witnessScript;
    } else if (input.redeemScript) {
      res.script = input.redeemScript;
    } else {
      if (input.nonWitnessUtxo) {
        const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
          cache,
          input,
          inputIndex
        );
        const prevoutIndex = unsignedTx.ins[inputIndex].index;
        res.script = nonWitnessUtxoTx.outs[prevoutIndex].script;
      } else if (input.witnessUtxo) {
        res.script = input.witnessUtxo.script;
      }
    }
    if (input.witnessScript || isP2WPKH(res.script)) {
      res.isSegwit = true;
    }
    return res;
  }
  function getSignersFromHD(inputIndex, inputs2, hdKeyPair) {
    const input = checkForInput(inputs2, inputIndex);
    if (!input.bip32Derivation || input.bip32Derivation.length === 0) {
      throw new Error("Need bip32Derivation to sign with HD");
    }
    const myDerivations = input.bip32Derivation.map((bipDv) => {
      if (compare(bipDv.masterFingerprint, hdKeyPair.fingerprint) === 0) {
        return bipDv;
      } else {
        return;
      }
    }).filter((v) => !!v);
    if (myDerivations.length === 0) {
      throw new Error(
        "Need one bip32Derivation masterFingerprint to match the HDSigner fingerprint"
      );
    }
    const signers = myDerivations.map((bipDv) => {
      const node = hdKeyPair.derivePath(bipDv.path);
      if (compare(bipDv.pubkey, node.publicKey) !== 0) {
        throw new Error("pubkey did not match bip32Derivation");
      }
      return node;
    });
    return signers;
  }
  function getSortedSigs(script, partialSig) {
    const p2ms2 = p2ms({ output: script });
    return p2ms2.pubkeys.map((pk) => {
      return (partialSig.filter((ps) => {
        return compare(ps.pubkey, pk) === 0;
      })[0] || {}).signature;
    }).filter((v) => !!v);
  }
  function scriptWitnessToWitnessStack(buffer) {
    let offset = 0;
    function readSlice(n) {
      offset += n;
      return buffer.slice(offset - n, offset);
    }
    function readVarInt() {
      const vi = decode5(buffer, offset);
      offset += encodingLength2(vi.bigintValue);
      return vi.numberValue;
    }
    function readVarSlice() {
      return readSlice(readVarInt());
    }
    function readVector() {
      const count = readVarInt();
      const vector = [];
      for (let i = 0; i < count; i++) vector.push(readVarSlice());
      return vector;
    }
    return readVector();
  }
  function sighashTypeToString(sighashType) {
    let text = sighashType & Transaction.SIGHASH_ANYONECANPAY ? "SIGHASH_ANYONECANPAY | " : "";
    const sigMod = sighashType & 31;
    switch (sigMod) {
      case Transaction.SIGHASH_ALL:
        text += "SIGHASH_ALL";
        break;
      case Transaction.SIGHASH_SINGLE:
        text += "SIGHASH_SINGLE";
        break;
      case Transaction.SIGHASH_NONE:
        text += "SIGHASH_NONE";
        break;
    }
    return text;
  }
  function addNonWitnessTxCache(cache, input, inputIndex) {
    cache.__NON_WITNESS_UTXO_BUF_CACHE[inputIndex] = input.nonWitnessUtxo;
    const tx = Transaction.fromBuffer(input.nonWitnessUtxo);
    cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;
    const self = cache;
    const selfIndex = inputIndex;
    delete input.nonWitnessUtxo;
    Object.defineProperty(input, "nonWitnessUtxo", {
      enumerable: true,
      get() {
        const buf = self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex];
        const txCache = self.__NON_WITNESS_UTXO_TX_CACHE[selfIndex];
        if (buf !== void 0) {
          return buf;
        } else {
          const newBuf = txCache.toBuffer();
          self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = newBuf;
          return newBuf;
        }
      },
      set(data) {
        self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = data;
      }
    });
  }
  function inputFinalizeGetAmts(inputs2, tx, cache, mustFinalize) {
    let inputAmount = 0n;
    inputs2.forEach((input, idx) => {
      if (mustFinalize && input.finalScriptSig)
        tx.ins[idx].script = input.finalScriptSig;
      if (mustFinalize && input.finalScriptWitness) {
        tx.ins[idx].witness = scriptWitnessToWitnessStack(
          input.finalScriptWitness
        );
      }
      if (input.witnessUtxo) {
        inputAmount += input.witnessUtxo.value;
      } else if (input.nonWitnessUtxo) {
        const nwTx = nonWitnessUtxoTxFromCache(cache, input, idx);
        const vout = tx.ins[idx].index;
        const out = nwTx.outs[vout];
        inputAmount += out.value;
      }
    });
    const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0n);
    const fee = inputAmount - outputAmount;
    if (fee < 0) {
      throw new Error("Outputs are spending more than Inputs");
    }
    const bytes = tx.virtualSize();
    cache.__FEE = fee;
    cache.__EXTRACTED_TX = tx;
    cache.__FEE_RATE = Math.floor(Number(fee / BigInt(bytes)));
  }
  function nonWitnessUtxoTxFromCache(cache, input, inputIndex) {
    const c = cache.__NON_WITNESS_UTXO_TX_CACHE;
    if (!c[inputIndex]) {
      addNonWitnessTxCache(cache, input, inputIndex);
    }
    return c[inputIndex];
  }
  function getScriptFromUtxo(inputIndex, input, cache) {
    const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
    return script;
  }
  function getScriptAndAmountFromUtxo(inputIndex, input, cache) {
    if (input.witnessUtxo !== void 0) {
      return {
        script: input.witnessUtxo.script,
        value: input.witnessUtxo.value
      };
    } else if (input.nonWitnessUtxo !== void 0) {
      const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
        cache,
        input,
        inputIndex
      );
      const o = nonWitnessUtxoTx.outs[cache.__TX.ins[inputIndex].index];
      return { script: o.script, value: o.value };
    } else {
      throw new Error("Can't find pubkey in input without Utxo data");
    }
  }
  function pubkeyInInput(pubkey, input, inputIndex, cache) {
    const script = getScriptFromUtxo(inputIndex, input, cache);
    const { meaningfulScript } = getMeaningfulScript(
      script,
      inputIndex,
      "input",
      input.redeemScript,
      input.witnessScript
    );
    return pubkeyInScript(pubkey, meaningfulScript);
  }
  function pubkeyInOutput(pubkey, output, outputIndex, cache) {
    const script = cache.__TX.outs[outputIndex].script;
    const { meaningfulScript } = getMeaningfulScript(
      script,
      outputIndex,
      "output",
      output.redeemScript,
      output.witnessScript
    );
    return pubkeyInScript(pubkey, meaningfulScript);
  }
  function redeemFromFinalScriptSig(finalScript) {
    if (!finalScript) return;
    const decomp = decompile(finalScript);
    if (!decomp) return;
    const lastItem = decomp[decomp.length - 1];
    if (!(lastItem instanceof Uint8Array) || isPubkeyLike(lastItem) || isSigLike(lastItem))
      return;
    const sDecomp = decompile(lastItem);
    if (!sDecomp) return;
    return lastItem;
  }
  function redeemFromFinalWitnessScript(finalScript) {
    if (!finalScript) return;
    const decomp = scriptWitnessToWitnessStack(finalScript);
    const lastItem = decomp[decomp.length - 1];
    if (isPubkeyLike(lastItem)) return;
    const sDecomp = decompile(lastItem);
    if (!sDecomp) return;
    return lastItem;
  }
  function compressPubkey(pubkey) {
    if (pubkey.length === 65) {
      const parity = pubkey[64] & 1;
      const newKey = pubkey.slice(0, 33);
      newKey[0] = 2 | parity;
      return newKey;
    }
    return pubkey.slice();
  }
  function isPubkeyLike(buf) {
    return buf.length === 33 && isCanonicalPubKey(buf);
  }
  function isSigLike(buf) {
    return isCanonicalScriptSignature(buf);
  }
  function getMeaningfulScript(script, index, ioType, redeemScript, witnessScript) {
    const isP2SH = isP2SHScript(script);
    const isP2SHP2WSH = isP2SH && redeemScript && isP2WSHScript(redeemScript);
    const isP2WSH = isP2WSHScript(script);
    if (isP2SH && redeemScript === void 0)
      throw new Error("scriptPubkey is P2SH but redeemScript missing");
    if ((isP2WSH || isP2SHP2WSH) && witnessScript === void 0)
      throw new Error(
        "scriptPubkey or redeemScript is P2WSH but witnessScript missing"
      );
    let meaningfulScript;
    if (isP2SHP2WSH) {
      meaningfulScript = witnessScript;
      checkRedeemScript(index, script, redeemScript, ioType);
      checkWitnessScript(index, redeemScript, witnessScript, ioType);
      checkInvalidP2WSH(meaningfulScript);
    } else if (isP2WSH) {
      meaningfulScript = witnessScript;
      checkWitnessScript(index, script, witnessScript, ioType);
      checkInvalidP2WSH(meaningfulScript);
    } else if (isP2SH) {
      meaningfulScript = redeemScript;
      checkRedeemScript(index, script, redeemScript, ioType);
    } else {
      meaningfulScript = script;
    }
    return {
      meaningfulScript,
      type: isP2SHP2WSH ? "p2sh-p2wsh" : isP2SH ? "p2sh" : isP2WSH ? "p2wsh" : "raw"
    };
  }
  function checkInvalidP2WSH(script) {
    if (isP2WPKH(script) || isP2SHScript(script)) {
      throw new Error("P2WPKH or P2SH can not be contained within P2WSH");
    }
  }
  function classifyScript(script) {
    if (isP2WPKH(script)) return "witnesspubkeyhash";
    if (isP2PKH(script)) return "pubkeyhash";
    if (isP2MS(script)) return "multisig";
    if (isP2PK(script)) return "pubkey";
    return "nonstandard";
  }
  function range4(n) {
    return [...Array(n).keys()];
  }

  // node_modules/ecpair/src/esm/networks.js
  var bitcoin2 = {
    messagePrefix: "Bitcoin Signed Message:\n",
    bech32: "bc",
    bip32: {
      public: 76067358,
      private: 76066276
    },
    pubKeyHash: 0,
    scriptHash: 5,
    wif: 128
  };

  // node_modules/ecpair/src/esm/types.js
  var Uint32Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(4294967295)
  );
  var Uint8Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(255)
  );
  var NetworkSchema = object({
    messagePrefix: union([string(), instance(Uint8Array)]),
    bech32: string(),
    bip32: object({
      public: Uint32Schema,
      private: Uint32Schema
    }),
    pubKeyHash: Uint8Schema,
    scriptHash: Uint8Schema,
    wif: Uint8Schema
  });
  var Buffer256Bit = pipe(instance(Uint8Array), length(32));

  // node_modules/wif/src/esm/index.js
  function decodeRaw(buffer, version) {
    if (version !== void 0 && buffer[0] !== version)
      throw new Error("Invalid network version");
    if (buffer.length === 33) {
      return {
        version: buffer[0],
        privateKey: buffer.slice(1, 33),
        compressed: false
      };
    }
    if (buffer.length !== 34)
      throw new Error("Invalid WIF length");
    if (buffer[33] !== 1)
      throw new Error("Invalid compression flag");
    return {
      version: buffer[0],
      privateKey: buffer.slice(1, 33),
      compressed: true
    };
  }
  function encodeRaw(version, privateKey, compressed) {
    if (privateKey.length !== 32)
      throw new TypeError("Invalid privateKey length");
    var result = new Uint8Array(compressed ? 34 : 33);
    var view = new DataView(result.buffer);
    view.setUint8(0, version);
    result.set(privateKey, 1);
    if (compressed) {
      result[33] = 1;
    }
    return result;
  }
  function decode19(str, version) {
    return decodeRaw(esm_default3.decode(str), version);
  }
  function encode20(wif) {
    return esm_default3.encode(encodeRaw(wif.version, wif.privateKey, wif.compressed));
  }

  // node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS4 = "0123456789abcdefABCDEF";
  var HEX_CODES4 = HEX_STRINGS4.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS4 = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS4.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER4 = new TextEncoder();
  var DECODER4 = new TextDecoder();
  function concat3(arrays) {
    const totalLength = arrays.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array2 of arrays) {
      result.set(array2, offset);
      offset += array2.length;
    }
    return result;
  }
  function fromHex3(hexString) {
    const hexBytes = ENCODER4.encode(hexString || "");
    const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
    let i;
    for (i = 0; i < resultBytes.length; i++) {
      const a = HEX_CODEPOINTS4[hexBytes[i * 2]];
      const b = HEX_CODEPOINTS4[hexBytes[i * 2 + 1]];
      if (a === void 0 || b === void 0) {
        break;
      }
      resultBytes[i] = a << 4 | b;
    }
    return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
  }
  function compare3(v1, v2) {
    const minLength = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLength; ++i) {
      if (v1[i] !== v2[i]) {
        return v1[i] < v2[i] ? -1 : 1;
      }
    }
    return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
  }
  function writeUInt324(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
  }

  // node_modules/ecpair/src/esm/testecc.js
  var h = (hex) => fromHex3(hex);
  var eq = (a, b) => compare3(a, b) === 0;
  function testEcc(ecc2) {
    assert(
      ecc2.isPoint(
        h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
      )
    );
    assert(
      !ecc2.isPoint(
        h("030000000000000000000000000000000000000000000000000000000000000005")
      )
    );
    assert(
      ecc2.isPrivate(
        h("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
      )
    );
    assert(
      ecc2.isPrivate(
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
      )
    );
    assert(
      !ecc2.isPrivate(
        h("0000000000000000000000000000000000000000000000000000000000000000")
      )
    );
    assert(
      !ecc2.isPrivate(
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141")
      )
    );
    assert(
      !ecc2.isPrivate(
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142")
      )
    );
    assert(
      eq(
        ecc2.privateAdd(
          h("0000000000000000000000000000000000000000000000000000000000000001"),
          h("0000000000000000000000000000000000000000000000000000000000000000")
        ),
        h("0000000000000000000000000000000000000000000000000000000000000001")
      )
    );
    assert(
      ecc2.privateAdd(
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e"),
        h("0000000000000000000000000000000000000000000000000000000000000003")
      ) === null
    );
    assert(
      eq(
        ecc2.privateAdd(
          h("e211078564db65c3ce7704f08262b1f38f1ef412ad15b5ac2d76657a63b2c500"),
          h("b51fbb69051255d1becbd683de5848242a89c229348dd72896a87ada94ae8665")
        ),
        h("9730c2ee69edbb958d42db7460bafa18fef9d955325aec99044c81c8282b0a24")
      )
    );
    assert(
      eq(
        ecc2.privateNegate(
          h("0000000000000000000000000000000000000000000000000000000000000001")
        ),
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
      )
    );
    assert(
      eq(
        ecc2.privateNegate(
          h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e")
        ),
        h("0000000000000000000000000000000000000000000000000000000000000003")
      )
    );
    assert(
      eq(
        ecc2.privateNegate(
          h("b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af")
        ),
        h("4eede1bf775995d70a494f0a7bb6bc11e0b8cccd41cce8009ab1132c8b0a3792")
      )
    );
    assert(
      eq(
        ecc2.pointCompress(
          h(
            "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
          ),
          true
        ),
        h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
      )
    );
    assert(
      eq(
        ecc2.pointCompress(
          h(
            "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
          ),
          false
        ),
        h(
          "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
        )
      )
    );
    assert(
      eq(
        ecc2.pointCompress(
          h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
          true
        ),
        h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
      )
    );
    assert(
      eq(
        ecc2.pointCompress(
          h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
          false
        ),
        h(
          "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
        )
      )
    );
    assert(
      eq(
        ecc2.pointFromScalar(
          h("b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af")
        ),
        h("02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99")
      )
    );
    assert(
      ecc2.xOnlyPointAddTweak(
        h("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
      ) === null
    );
    let xOnlyRes = ecc2.xOnlyPointAddTweak(
      h("1617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b"),
      h("a8397a935f0dfceba6ba9618f6451ef4d80637abf4e6af2669fbc9de6a8fd2ac")
    );
    assert(
      eq(
        xOnlyRes.xOnlyPubkey,
        h("e478f99dab91052ab39a33ea35fd5e6e4933f4d28023cd597c9a1f6760346adf")
      ) && xOnlyRes.parity === 1
    );
    xOnlyRes = ecc2.xOnlyPointAddTweak(
      h("2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991"),
      h("823c3cd2142744b075a87eade7e1b8678ba308d566226a0056ca2b7a76f86b47")
    );
    assert(
      eq(
        xOnlyRes.xOnlyPubkey,
        h("9534f8dc8c6deda2dc007655981c78b49c5d96c778fbf363462a11ec9dfd948c")
      ) && xOnlyRes.parity === 0
    );
    assert(
      eq(
        ecc2.sign(
          h("5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed"),
          h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
        ),
        h(
          "54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5"
        )
      )
    );
    assert(
      ecc2.verify(
        h("5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed"),
        h("0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        h(
          "54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5"
        )
      )
    );
    if (ecc2.signSchnorr) {
      assert(
        eq(
          ecc2.signSchnorr(
            h("7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c"),
            h("c90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b14e5c9"),
            h("c87aa53824b4d7ae2eb035a2b5bbbccc080e76cdc6d1692c4b0b62d798e6d906")
          ),
          h(
            "5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7"
          )
        )
      );
    }
    if (ecc2.verifySchnorr) {
      assert(
        ecc2.verifySchnorr(
          h("7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c"),
          h("dd308afec5777e13121fa72b9cc1b7cc0139715309b086c960e18fd969774eb8"),
          h(
            "5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7"
          )
        )
      );
    }
  }
  function assert(bool) {
    if (!bool) throw new Error("ecc library invalid");
  }

  // node_modules/ecpair/src/esm/ecpair.js
  var ECPairOptionsSchema = optional(
    object({
      compressed: optional(boolean()),
      network: optional(NetworkSchema),
      // https://github.com/fabian-hiller/valibot/issues/243#issuecomment-2182514063
      rng: optional(
        pipe(
          instance(Function),
          transform((func) => {
            return (arg) => {
              const parsedArg = parse(optional(number()), arg);
              const returnedValue = func(parsedArg);
              const parsedReturn = parse(instance(Uint8Array), returnedValue);
              return parsedReturn;
            };
          })
        )
      )
    })
  );
  var toXOnly2 = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);
  function ECPairFactory(ecc2) {
    testEcc(ecc2);
    function isPoint2(maybePoint) {
      return ecc2.isPoint(maybePoint);
    }
    function fromPrivateKey(buffer, options) {
      parse(Buffer256Bit, buffer);
      if (!ecc2.isPrivate(buffer))
        throw new TypeError("Private key not in range [1, n)");
      parse(ECPairOptionsSchema, options);
      return new ECPair2(buffer, void 0, options);
    }
    function fromPublicKey(buffer, options) {
      if (!ecc2.isPoint(buffer)) {
        throw new Error("Point not on the curve");
      }
      parse(ECPairOptionsSchema, options);
      return new ECPair2(void 0, buffer, options);
    }
    function fromWIF(wifString, network) {
      const decoded = decode19(wifString);
      const version = decoded.version;
      if (Array.isArray(network)) {
        network = network.filter((x) => {
          return version === x.wif;
        }).pop();
        if (!network) throw new Error("Unknown network version");
      } else {
        network = network || bitcoin2;
        if (version !== network.wif) throw new Error("Invalid network version");
      }
      return fromPrivateKey(decoded.privateKey, {
        compressed: decoded.compressed,
        network
      });
    }
    function makeRandom(options) {
      parse(ECPairOptionsSchema, options);
      if (options === void 0) options = {};
      const rng = options.rng || ((size) => crypto.getRandomValues(new Uint8Array(size)));
      let d;
      do {
        d = rng(32);
        parse(Buffer256Bit, d);
      } while (!ecc2.isPrivate(d));
      return fromPrivateKey(d, options);
    }
    class ECPair2 {
      constructor(__D, __Q, options) {
        __publicField(this, "__D");
        __publicField(this, "__Q");
        __publicField(this, "compressed");
        __publicField(this, "network");
        __publicField(this, "lowR");
        this.__D = __D;
        this.__Q = __Q;
        this.lowR = false;
        if (options === void 0) options = {};
        this.compressed = options.compressed === void 0 ? true : options.compressed;
        this.network = options.network || bitcoin2;
        if (__Q !== void 0) this.__Q = ecc2.pointCompress(__Q, this.compressed);
      }
      get privateKey() {
        return this.__D;
      }
      get publicKey() {
        if (!this.__Q) {
          const p = ecc2.pointFromScalar(this.__D, this.compressed);
          this.__Q = p;
        }
        return this.__Q;
      }
      toWIF() {
        if (!this.__D) throw new Error("Missing private key");
        return encode20({
          compressed: this.compressed,
          privateKey: this.__D,
          version: this.network.wif
        });
      }
      tweak(t) {
        if (this.privateKey) return this.tweakFromPrivateKey(t);
        return this.tweakFromPublicKey(t);
      }
      sign(hash, lowR) {
        if (!this.__D) throw new Error("Missing private key");
        if (lowR === void 0) lowR = this.lowR;
        if (lowR === false) {
          return ecc2.sign(hash, this.__D);
        } else {
          let sig = ecc2.sign(hash, this.__D);
          const extraData = new Uint8Array(32);
          let counter = 0;
          while (sig[0] > 127) {
            counter++;
            writeUInt324(extraData, 0, counter, "LE");
            sig = ecc2.sign(hash, this.__D, extraData);
          }
          return sig;
        }
      }
      signSchnorr(hash) {
        if (!this.privateKey) throw new Error("Missing private key");
        if (!ecc2.signSchnorr)
          throw new Error("signSchnorr not supported by ecc library");
        return ecc2.signSchnorr(hash, this.privateKey);
      }
      verify(hash, signature2) {
        return ecc2.verify(hash, this.publicKey, signature2);
      }
      verifySchnorr(hash, signature2) {
        if (!ecc2.verifySchnorr)
          throw new Error("verifySchnorr not supported by ecc library");
        return ecc2.verifySchnorr(hash, this.publicKey.subarray(1, 33), signature2);
      }
      tweakFromPublicKey(t) {
        const xOnlyPubKey = toXOnly2(this.publicKey);
        const tweakedPublicKey = ecc2.xOnlyPointAddTweak(xOnlyPubKey, t);
        if (!tweakedPublicKey || tweakedPublicKey.xOnlyPubkey === null)
          throw new Error("Cannot tweak public key!");
        const parityByte = Uint8Array.from([
          tweakedPublicKey.parity === 0 ? 2 : 3
        ]);
        return fromPublicKey(
          concat3([parityByte, tweakedPublicKey.xOnlyPubkey]),
          {
            network: this.network,
            compressed: this.compressed
          }
        );
      }
      tweakFromPrivateKey(t) {
        const hasOddY = this.publicKey[0] === 3 || this.publicKey[0] === 4 && (this.publicKey[64] & 1) === 1;
        const privateKey = hasOddY ? ecc2.privateNegate(this.privateKey) : this.privateKey;
        const tweakedPrivateKey = ecc2.privateAdd(privateKey, t);
        if (!tweakedPrivateKey) throw new Error("Invalid tweaked private key!");
        return fromPrivateKey(tweakedPrivateKey, {
          network: this.network,
          compressed: this.compressed
        });
      }
    }
    return {
      isPoint: isPoint2,
      fromPrivateKey,
      fromPublicKey,
      fromWIF,
      makeRandom
    };
  }

  // miniapp/app.js
  var ecc = __toESM(require_dist2(), 1);
  var urlParams = new URLSearchParams(window.location.search);
  var networkParam = urlParams.get("network") || "mainnet";
  var appNetwork = networks_exports.bitcoin;
  var mempoolApiUrl = "https://mempool.space/api";
  if (networkParam === "testnet") {
    appNetwork = networks_exports.testnet;
    mempoolApiUrl = "https://mempool.space/testnet4/api";
  } else if (networkParam === "signet") {
    appNetwork = networks_exports.testnet;
    mempoolApiUrl = "https://mempool.space/signet/api";
  }
  var ECPair = ECPairFactory(ecc);
  var tg = window.Telegram?.WebApp;
  var isTelegramEnv = tg && tg.initData !== "";
  var envIndicator = document.getElementById("env-indicator");
  if (isTelegramEnv) {
    tg.expand();
    envIndicator.textContent = "Running in Telegram MiniApp \u{1F535}";
  } else {
    envIndicator.textContent = "Running in Browser (Standalone) \u{1F310}";
  }
  var elPsbtHex = document.getElementById("psbt-hex");
  var elEncryptedWif = document.getElementById("encrypted-wif");
  var elPassword = document.getElementById("password");
  var btnPreview = document.getElementById("btn-preview");
  var previewSection = document.getElementById("preview-section");
  var txDetails = document.getElementById("tx-details");
  var btnSignBroadcast = document.getElementById("btn-sign-broadcast");
  var statusMessage = document.getElementById("status-message");
  var btnSignOnly = document.getElementById("btn-sign-only");
  var signedHexSection = document.getElementById("signed-hex-section");
  var signedTxHex = document.getElementById("signed-tx-hex");
  var currentPsbt = null;
  var currentDecryptedWif = null;
  var isTxSigned = false;
  var finalTxHex = "";
  if (urlParams.has("psbt")) elPsbtHex.value = urlParams.get("psbt");
  var hexToBytes3 = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  async function decryptWIF(encryptedString, password) {
    const parts = encryptedString.split(":");
    if (parts.length !== 4) throw new Error("Invalid encrypted WIF format");
    const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
    const salt = hexToBytes3(saltHex);
    const iv = hexToBytes3(ivHex);
    const authTag = hexToBytes3(authTagHex);
    const ciphertext = hexToBytes3(encryptedHex);
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const payload = new Uint8Array(ciphertext.length + authTag.length);
    payload.set(ciphertext);
    payload.set(authTag, ciphertext.length);
    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        payload
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      throw new Error("Incorrect password or corrupted data");
    }
  }
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.classList.remove("hidden");
    if (isTelegramEnv) {
      tg.HapticFeedback.notificationOccurred(
        type === "error" ? "error" : "success"
      );
    }
  }
  btnPreview.addEventListener("click", async () => {
    statusMessage.classList.add("hidden");
    previewSection.classList.add("hidden");
    isTxSigned = false;
    finalTxHex = "";
    signedHexSection.classList.add("hidden");
    signedTxHex.value = "";
    btnSignOnly.disabled = false;
    btnSignOnly.classList.remove("hidden");
    btnSignBroadcast.disabled = false;
    btnSignBroadcast.classList.remove("hidden");
    btnSignBroadcast.textContent = "Sign and Broadcast";
    try {
      if (!elPsbtHex.value || !elEncryptedWif.value || !elPassword.value) {
        throw new Error("Please fill in all fields.");
      }
      currentDecryptedWif = await decryptWIF(
        elEncryptedWif.value.trim(),
        elPassword.value
      );
      currentPsbt = Psbt2.fromHex(elPsbtHex.value.trim(), {
        network: appNetwork
      });
      let html = `
    <div class="tx-summary">
        <div class="tx-stat">
            <span class="tx-stat-label">\u{1F4E5} Inputs</span>
            <span class="tx-stat-value">${currentPsbt.txInputs.length}</span>
        </div>
        <div class="tx-stat">
            <span class="tx-stat-label">\u{1F4E4} Outputs</span>
            <span class="tx-stat-value">${currentPsbt.txOutputs.length}</span>
        </div>
    </div>
    <h3 class="tx-subtitle">Destination Details</h3>
    <div class="tx-outputs-list">
`;
      currentPsbt.txOutputs.forEach((out, i) => {
        const btcAmount = (Number(out.value) / 1e8).toFixed(8);
        html += `
        <div class="tx-output-item">
            <div class="tx-output-header">
                <span class="tx-output-index">Output #${i}</span>
                <span class="tx-output-amount"><strong>${btcAmount}</strong> <small>BTC</small></span>
            </div>
            <div class="tx-output-address">${out.address || "Unknown Script"}</div>
        </div>
    `;
      });
      html += `</div>`;
      txDetails.innerHTML = html;
      txDetails.className = "";
      previewSection.classList.remove("hidden");
    } catch (error) {
      showStatus(error.message, "error");
    }
  });
  btnSignOnly.addEventListener("click", () => {
    try {
      if (!isTxSigned) {
        const keypair = ECPair.fromWIF(currentDecryptedWif, appNetwork);
        currentPsbt.signAllInputs(keypair);
        currentPsbt.finalizeAllInputs();
        finalTxHex = currentPsbt.extractTransaction().toHex();
        isTxSigned = true;
      }
      signedTxHex.value = finalTxHex;
      signedHexSection.classList.remove("hidden");
      showStatus("Transaction signed successfully. You can copy the Hex.", "success");
      btnSignOnly.disabled = true;
    } catch (error) {
      showStatus(`Error signing: ${error.message}`, "error");
    }
  });
  btnSignBroadcast.addEventListener("click", async () => {
    try {
      btnSignBroadcast.disabled = true;
      btnSignBroadcast.textContent = "Broadcasting...";
      if (!isTxSigned) {
        const keypair = ECPair.fromWIF(currentDecryptedWif, appNetwork);
        currentPsbt.signAllInputs(keypair);
        currentPsbt.finalizeAllInputs();
        finalTxHex = currentPsbt.extractTransaction().toHex();
        isTxSigned = true;
      }
      signedTxHex.value = finalTxHex;
      signedHexSection.classList.remove("hidden");
      const res = await fetch(`${mempoolApiUrl}/tx`, {
        method: "POST",
        body: finalTxHex
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Success! TXID:
${await res.text()}`, "success");
      btnSignBroadcast.classList.add("hidden");
      btnSignOnly.classList.add("hidden");
    } catch (error) {
      showStatus(`Error: ${error.message}`, "error");
      btnSignBroadcast.disabled = false;
      btnSignBroadcast.textContent = "Sign and Broadcast";
    }
  });
})();
/*! Bundled license information:

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/der.js:
@noble/curves/abstract/weierstrass.js:
@noble/curves/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
