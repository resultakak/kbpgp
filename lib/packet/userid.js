// Generated by IcedCoffeeScript 1.6.3-g
(function() {
  var AES, C, Packet, SHA1, SHA256, UserID, calc_checksum, encrypt, native_rng, triplesec, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };



  C = require('../const').openpgp;

  triplesec = require('triplesec');

  _ref = triplesec.hash, SHA1 = _ref.SHA1, SHA256 = _ref.SHA256;

  AES = triplesec.ciphers.AES;

  native_rng = triplesec.prng.native_rng;

  calc_checksum = require('../util').calc_checksum;

  encrypt = require('../cfb').encrypt;

  Packet = require('./base').Packet;

  UserID = (function(_super) {
    __extends(UserID, _super);

    function UserID(userid) {
      this.userid = userid;
      UserID.__super__.constructor.call(this);
    }

    UserID.prototype.utf8 = function() {
      return this.userid;
    };

    UserID.prototype.write = function() {
      return this.frame_packet(C.packet_tags.userid, this.userid);
    };

    return UserID;

  })(Packet);

  exports.UserID = UserID;

}).call(this);