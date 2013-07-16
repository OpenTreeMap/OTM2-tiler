var assert = require("assert");
var filterStringToSql = require("../filterStringToSql");

var assertSql = function(objectString, expectedSql) {
    var result = filterStringToSql(objectString);
    assert.equal(result, expectedSql);
};

describe('filterStringToSql', function() {

    // NULL AND EMPTY HANDLING

    it('returns an empty string when passed undefined', function() {
        assertSql(undefined, '');
    });

    it('returns an empty string when passed null', function() {
        assertSql(null, '');
    });

    it('returns an empty string when passed an empty string', function() {
        assertSql('', '');
    });

    // INVALID JSON HANDLING

    it('raises an error if the specified value is not JSON', function() {
        assert.throws(function() {
            filterStringToSql('height=1');
        }, Error);
    });

    // MODEL NAME VALIDATION

    it('raises an error if the field is not prefixed with a model', function() {
        assert.throws(function() {
            filterStringToSql('{"height": 1}');
        }, Error);
    });

    it('raises an error if the field is not prefixed with a valid model', function() {
        assert.throws(function() {
            filterStringToSql('{"foo.height": 1}');
        }, Error);
    });

    // INVALID PREDICATE HANDLING

    it('raises an error with an invalid predicate', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"WILLBE": 1}}');
        }, Error);
    });

    // SINGLE EXACT MATCHES

    it('returns a single numeric property match with IS syntax', function() {
        assertSql('{"tree.height": {"IS": 1}}', '(\"treemap_tree\".\"height\" = 1)');
    });

    it('returns a single numeric property match with short syntax', function() {
        assertSql('{"tree.height": 1}', '(\"treemap_tree\".\"height\" = 1)');
    });

    it('returns a single string property match with IS syntax', function() {
        assertSql('{"plot.address": {"IS": "1234 Market St"}}',
                  "(\"treemap_plot\".\"address\" = '1234 Market St')");
    });

    it('returns a single string property match with short syntax', function() {
        assertSql('{"plot.address": "1234 Market St"}',
                  "(\"treemap_plot\".\"address\" = '1234 Market St')");
    });

    // LIKE MATCHES

    it('returns a LIKE statement', function() {
        assertSql('{"plot.address": {"LIKE": "%Market St%"}}',
                  "(\"treemap_plot\".\"address\" ILIKE '%Market St%')");
    });

    // LIST MATCHES

    it('returns an IN clause for a numeric list', function () {
        assertSql('{"plot.type": {"IN": [1,2]}}', "(\"treemap_plot\".\"type\" IN (1,2))");
    });

    it('returns an IN clause for a string list', function () {
        assertSql('{"plot.address": {"IN": ["1234 Market St", "123 Market St"]}}',
                  "(\"treemap_plot\".\"address\" IN ('1234 Market St','123 Market St'))");
    });

    it('raises an error when IN is mixed with IS', function() {
        assert.throws(function() {
            filterStringToSql('{"plot.type": {"IN": [1,2], "IS": "Array"}}');
        }, Error);
    });

    // MIN AND MAX MATCHES

    it('return a less or equal to clause', function () {
        assertSql('{"tree.height": {"MAX": 2}}', "(\"treemap_tree\".\"height\" <= 2)");
    });

    it('return a less than clause', function () {
        assertSql('{"tree.height": {"MAX": {"value": 2, "EXCLUSIVE": true}}}',
                  "(\"treemap_tree\".\"height\" < 2)");
    });

    it('return a greater than or equal to clause', function () {
        assertSql('{"tree.height": {"MIN": 2}}', "(\"treemap_tree\".\"height\" >= 2)");
    });

    it('return a greater than or equal to clause', function () {
        assertSql('{"tree.height": {"MIN": {"value": 2, "EXCLUSIVE": true}}}',
                  "(\"treemap_tree\".\"height\" > 2)");
    });

    it('return an inclusive min and max clause', function () {
        assertSql('{"tree.height": {"MIN": 2, "MAX": 3}}',
                  "(\"treemap_tree\".\"height\" >= 2 AND \"treemap_tree\".\"height\" <= 3)");
    });

    it('return an exclusive min and max clause', function () {
        assertSql('{"tree.height": {"MIN": {"value": 2, "EXCLUSIVE": true}, "MAX": {"value": 3, "EXCLUSIVE": true}}}',
                  "(\"treemap_tree\".\"height\" > 2 AND \"treemap_tree\".\"height\" < 3)");
    });

    it('raises an error when MIN is mixed with IN', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MIN": 1, "IN": [1]}}');
        }, Error);
    });

    it('raises an error when MAX is mixed with IN', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MAX": 1, "IN": [1]}}');
        }, Error);
    });

    it('raises an error when MIN is mixed with IS', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MIN": 1, "IS": 1}}');
        }, Error);
    });

    it('raises an error when MAX is mixed with IN', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MAX": 1, "IS": 1}}');
        }, Error);
    });

    it('raises an error when MIN is mixed with LIKE', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MIN": 1, "LIKE": "%market%"}}');
        }, Error);
    });

    it('raises an error when MAX is mixed with LIKE', function() {
        assert.throws(function() {
            filterStringToSql('{"tree.height": {"MAX": 1, "LIKE": "%market%"}}');
        }, Error);
    });

    // MULTIPLE FIELDS

    it('supports ANDing multiple fields', function () {
        assertSql('{"tree.height": {"MIN": 1, "MAX": 2}, "plot.type": {"IN": [1,2]}}',
                  "(\"treemap_tree\".\"height\" >= 1 AND \"treemap_tree\".\"height\" <= 2) " +
                      "AND (\"treemap_plot\".\"type\" IN (1,2))");
    });

    // COMBINATORS

    it('supports OR with a combinator', function () {
        assertSql('["OR", {"tree.height": {"MIN": 1}}, {"plot.type": {"IN": [1,2]}}]',
                  "((\"treemap_tree\".\"height\" >= 1) OR (\"treemap_plot\".\"type\" IN (1,2)))");
    });

    it('supports nested combinators', function () {
        assertSql('["AND", {"tree.height": {"MIN": 1}}, ["OR", {"plot.type": {"IN": [1,2]}}, {"tree.dbh": {"MIN": 3}}]]',
                  "((\"treemap_tree\".\"height\" >= 1) AND ((\"treemap_plot\".\"type\" IN (1,2)) OR (\"treemap_tree\".\"dbh\" >= 3)))");
    });

    it('generates working SQL from a one element combinator', function () {
        assertSql('["OR", {"tree.height": {"MIN": 1}}]',
                  "((\"treemap_tree\".\"height\" >= 1))");
    });

    it('raises an error when a combinator is empty', function() {
        assert.throws(function() {
            filterStringToSql('[]');
        }, Error);
    });

    // DATETIME HANDLING

    it('supports datetimes in YYYY-MM-DDTHH:mm:ss format', function () {
        assertSql('{"tree.created": {"MIN": "2013-07-15T15:13:01"}}',
                  "(\"treemap_tree\".\"created\" >= (DATE '2013-07-15' + TIME '15:13:01'))");
    });

    it('supports datetimes in YYYY-MM-DD HH:mm:ss format', function () {
        assertSql('{"tree.created": {"MIN": "2013-07-15 15:13:01"}}',
                  "(\"treemap_tree\".\"created\" >= (DATE '2013-07-15' + TIME '15:13:01'))");
    });

    it('only dates that include times are recognized as dates', function () {
        assertSql('{"tree.created": {"MIN": "2013-07-15"}}',
                  "(\"treemap_tree\".\"created\" >= '2013-07-15')");
    });

    it('only dates that include military times are recognized as dates', function () {
        assertSql('{"tree.created": {"MIN": "2013-07-15 2:12 PM"}}',
                  "(\"treemap_tree\".\"created\" >= '2013-07-15 2:12 PM')");
    });

    // SANITIZING

    it('sanitizes column names', function () {
        assertSql('{"tree.height; DROP TABLE treemap_tree;": {"IS": 1}}', '(\"treemap_tree\".\"height\" = 1)');
    });

    it('sanitizes values', function () {
        assertSql('{"tree.height": {"IS": "1; SELECT 1; DROP TABLE treemap_tree;"}}',
                  '(\"treemap_tree\".\"height\" = \'1\')');
    });
});