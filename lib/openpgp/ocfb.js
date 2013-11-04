// Generated by IcedCoffeeScript 1.6.3-g
(function() {
  var AES, Base, Decryptor, Encryptor, SlicerBuffer, WordArray, decrypt, encrypt, repeat, rng, test, triplesec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };



  WordArray = require('triplesec').WordArray;

  SlicerBuffer = require('./buffer').SlicerBuffer;

  triplesec = require('triplesec');

  AES = triplesec.ciphers.AES;

  repeat = function(b, n) {
    return Buffer.concat([b, b.slice(b.length - n)]);
  };

  Base = (function() {
    function Base(_arg) {
      var key;
      this.block_cipher_class = _arg.block_cipher_class, key = _arg.key, this.cipher = _arg.cipher, this.resync = _arg.resync;
      this.block_cipher_class || (this.block_cipher_class = AES);
      this.cipher || (this.cipher = new this.block_cipher_class(WordArray.from_buffer(key)));
      this.block_size = this.cipher.blockSize;
      this.out_bufs = [];
    }

    Base.prototype.compact = function() {
      var b;
      b = Buffer.concat(this.out_bufs);
      this.out_bufs = [b];
      return b;
    };

    return Base;

  })();

  Encryptor = (function(_super) {
    __extends(Encryptor, _super);

    function Encryptor(_arg) {
      var block_cipher_class, cipher, key, prefixrandom, resync;
      block_cipher_class = _arg.block_cipher_class, key = _arg.key, cipher = _arg.cipher, prefixrandom = _arg.prefixrandom, resync = _arg.resync;
      Encryptor.__super__.constructor.call(this, {
        block_cipher_class: block_cipher_class,
        key: key,
        cipher: cipher,
        resync: resync
      });
      this._init(prefixrandom);
    }

    Encryptor.prototype._enc = function() {
      this.FRE = WordArray.from_buffer(this.FR);
      return this.cipher.encryptBlock(this.FRE.words, 0);
    };

    Encryptor.prototype._emit_sb = function(sb) {
      var buf, deficit, i, pad;
      buf = (deficit = this.block_size - sb.rem()) > 0 ? (pad = new Buffer((function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= deficit ? _i < deficit : _i > deficit; i = 0 <= deficit ? ++_i : --_i) {
          _results.push(0);
        }
        return _results;
      })()), Buffer.concat([sb.consume_rest_to_buffer(), pad])) : sb.read_buffer(this.block_size);
      return this._emit_buf(buf);
    };

    Encryptor.prototype._emit_buf = function(buf) {
      var wa;
      wa = WordArray.from_buffer(buf.slice(0, this.block_size));
      wa.xor(this.FRE, {
        n_words: Math.min(wa.words.length, this.FRE.words.length)
      });
      buf = wa.to_buffer();
      this.out_bufs.push(buf);
      return this.FR = new Buffer(buf);
    };

    Encryptor.prototype._init = function(prefixrandom) {
      var b, canary, ct, i, offset;
      this.FR = new Buffer((function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.block_size; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(0);
        }
        return _results;
      }).call(this));
      prefixrandom = repeat(prefixrandom, 2);
      this._enc();
      this._emit_buf(prefixrandom);
      this._enc();
      b = this.FRE.to_buffer();
      canary = new Buffer((function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < 2; i = ++_i) {
          _results.push(b.readUInt8(i) ^ prefixrandom.readUInt8(this.block_size + i));
        }
        return _results;
      }).call(this));
      this.out_bufs.push(canary);
      offset = this.resync ? 2 : 0;
      ct = this.compact();
      ct.copy(this.FR, 0, offset, offset + this.block_size);
      return this._enc();
    };

    Encryptor.prototype.enc = function(plaintext) {
      var buf, ct, sb, wa;
      sb = new SlicerBuffer(plaintext);
      if (this.resync) {
        this._emit_sb(sb);
      } else {
        buf = Buffer.concat([new Buffer([0, 0]), sb.read_buffer(this.block_size - 2)]);
        wa = WordArray.from_buffer(buf);
        wa.xor(this.FRE, {});
        buf = wa.to_buffer().slice(2);
        this.out_bufs.push(buf);
        ct = this.compact();
        ct.copy(this.FR, 0, ct.length - this.block_size, ct.length);
      }
      while (sb.rem()) {
        this._enc();
        this._emit_sb(sb);
      }
      return this.compact();
    };

    return Encryptor;

  })(Base);

  Decryptor = (function(_super) {
    __extends(Decryptor, _super);

    function Decryptor(_arg) {
      var block_cipher_class, cipher, key, prefixrandom, resync;
      block_cipher_class = _arg.block_cipher_class, key = _arg.key, cipher = _arg.cipher, prefixrandom = _arg.prefixrandom, resync = _arg.resync, this.ciphertext = _arg.ciphertext;
      Decryptor.__super__.constructor.call(this, {
        block_cipher_class: block_cipher_class,
        key: key,
        cipher: cipher,
        resync: resync
      });
      this._init();
    }

    Decryptor.prototype._init = function() {
      return this.reset();
    };

    Decryptor.prototype.reset = function() {
      return this.sb = new SlicerBuffer(this.ciphertext);
    };

    Decryptor.prototype.next_block = function() {
      return WordArray.from_buffer(this.sb.read_buffer_at_most(this.block_size));
    };

    Decryptor.prototype.get_prefix = function() {
      return this._prefix;
    };

    Decryptor.prototype.check = function() {
      var ablock, i, iblock, lhs, rhs;
      this.reset();
      iblock = new WordArray((function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.block_size / 4; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(0);
        }
        return _results;
      }).call(this));
      this.cipher.encryptBlock(iblock.words, 0);
      ablock = this.next_block();
      iblock.xor(ablock, {});
      this._prefix = iblock.to_buffer();
      this.cipher.encryptBlock(ablock.words, 0);
      lhs = iblock.words.slice(-1)[0] & 0xffff;
      rhs = (ablock.words[0] >>> 16) ^ (this.sb.peek_uint16());
      if (lhs === rhs) {
        return null;
      } else {
        return new Error("Canary block mismatch: " + lhs + " != " + rhs);
      }
    };

    Decryptor.prototype.dec = function() {
      var ablock, iblock, out;
      this.reset();
      if (this.resync) {
        this.sb.advance(2);
      }
      iblock = this.next_block();
      while (this.sb.rem()) {
        ablock = iblock;
        this.cipher.encryptBlock(ablock.words, 0);
        iblock = this.next_block();
        ablock.xor(iblock, {});
        this.out_bufs.push(ablock.to_buffer().slice(0, iblock.sigBytes));
      }
      out = this.compact();
      if (!this.resync) {
        out = out.slice(2);
      }
      return out;
    };

    return Decryptor;

  })(Base);

  encrypt = function(_arg) {
    var block_cipher_class, cipher, eng, key, plaintext, prefixrandom, resync;
    block_cipher_class = _arg.block_cipher_class, key = _arg.key, cipher = _arg.cipher, prefixrandom = _arg.prefixrandom, resync = _arg.resync, plaintext = _arg.plaintext;
    eng = new Encryptor({
      block_cipher_class: block_cipher_class,
      key: key,
      cipher: cipher,
      prefixrandom: prefixrandom,
      resync: resync
    });
    return eng.enc(plaintext);
  };

  decrypt = function(_arg) {
    var block_cipher_class, cipher, ciphertext, eng, err, key, resync;
    block_cipher_class = _arg.block_cipher_class, key = _arg.key, cipher = _arg.cipher, resync = _arg.resync, ciphertext = _arg.ciphertext;
    eng = new Decryptor({
      block_cipher_class: block_cipher_class,
      key: key,
      cipher: cipher,
      resync: resync,
      ciphertext: ciphertext
    });
    err = eng.check();
    if (err != null) {
      throw err;
    }
    return eng.dec();
  };

  exports.encrypt = encrypt;

  exports.decrypt = decrypt;

  exports.Decryptor = Decryptor;

  rng = require('crypto').rng;

  test = function() {
    var block_cipher_class, ct, key, plaintext, prefixrandom, pt;
    plaintext = new Buffer("a man a plan a canal panama. and you know the rest");
    key = rng(32);
    prefixrandom = new Buffer([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    block_cipher_class = AES;
    ct = encrypt({
      block_cipher_class: block_cipher_class,
      key: key,
      prefixrandom: prefixrandom,
      plaintext: plaintext
    });
    console.log(ct.toString('hex'));
    pt = decrypt({
      block_cipher_class: block_cipher_class,
      key: key,
      prefixrandom: prefixrandom,
      ciphertext: ct
    });
    return console.log(pt.toString('utf8'));
  };

}).call(this);