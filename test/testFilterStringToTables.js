var assert = require("assert");
var filterStringToTables = require("../filterStringToTables");
var config = require("../config.json");

describe('filterStringToTables', function() {

    it('returns "tree" tables when "tree" is in the filter string', function() {
        var sql = filterStringToTables('{"tree.id":{"IS":"1"}}');
        assert.equal(sql, config.sqlForPlots.tables.tree);
    });

    it('returns "tree" tables when "species" is in the filter string', function() {
        var sql = filterStringToTables('{"species.id":{"IS":"1"}}');
        assert.equal(sql, config.sqlForPlots.tables.tree);
    });

    it('returns "plot" tables when "plot" is in the filter string', function() {
        var sql = filterStringToTables('{"plot.id":{"IS":"1"}}');
        assert.equal(sql, config.sqlForPlots.tables.plot);
    });

    it('returns "tree" tables when "tree" is nested in the filter string', function() {
        var sql = filterStringToTables('["AND", {"plot.id":{"IS":"1"}, {"tree.id":{"IN":[1,2,3]}}}]');
        assert.equal(sql, config.sqlForPlots.tables.tree);
    });
});
