//scrubber.asynct
var Scrubber = require('../../lib/scrubber')
,	sys = require('sys');

//two trivial tests
exports['test scrubber one num'] = function (test){
	s = new Scrubber();

	r = s.scrub([1]);
	
	test.deepEqual(r.callbacks,{});
	test.deepEqual(r.arguments,[1]);
	test.deepEqual(r,{
		arguments:[1]
	,	callbacks: {}
	,	links: {}
	});
	test.finish();
}
exports['test scrubber one string'] = function (test){
	s = new Scrubber();
	
	r = s.scrub(["HELLO"]);
	
	test.deepEqual(r.callbacks,{});
	test.deepEqual(r.arguments,["HELLO"]);
	test.deepEqual(r,{
		arguments:["HELLO"]
	,	callbacks: {}
	,	links: {}
	});
	test.finish();
}

//something slightly more interesting.

exports['test scrubber one function'] = function (test){
	s = new Scrubber();
	function a(){}
	
	r = s.scrub([a]);

	test.deepEqual(r,{
		arguments:["[Function]"]
	,	callbacks: {'0' : ['0']}
	,	links: {}
	});
	test.finish();
}

exports['test scrubber two functions'] = function (test){
	s = new Scrubber();
	function a(){}
	function b(){}
	
	r = s.scrub([a,b]);

	test.deepEqual(r,{
		arguments:["[Function]","[Function]"]
	,	callbacks: {
			'0' : ['0']
		,	'1' : ['1']
		}
	,	links: {}
	});
	test.finish();
}

exports['test scrubber complex functions'] = function (test){
	s = new Scrubber();
	function a(){}
	function b(){}
	function c(){}
	
	args = {
		o: 1
	,	a: a
	,	b: b
	,	c: {
			d: c
		,	e: "e"
		}
	}
		
	r = s.scrub([args]);

	test.deepEqual(r,{
		arguments:[{
			o: 1
		,	a: '[Function]'
		,	b: '[Function]'
		,	c: {
				d: '[Function]'
			,	e: "e"
			}
		}]
	,	callbacks: {
			'0' : ['0','a']
		,	'1' : ['0','b']
		,	'2' : ['0','c','d']
		}
	,	links: {}
	});
	test.finish();
}
exports['test duplicate function'] = function (test){
	s = new Scrubber();
	function a(){}
	//scrubber does not check whether a is the same function.
	r = s.scrub([a,a,a]);

	test.deepEqual(r,{
		arguments: ['[Function]','[Function]','[Function]']
	,	callbacks: {
			'0' : ['0']
		,	'1' : ['1']
		,	'2' : ['2']
		}
	,	links: {}
	});
	
	test.finish();

}

/*
 scrubber scrub self-referential arguments.
*/
exports['test self referential arguments'] = function (test){
	s = new Scrubber();

	args = [1,2,3]
	args.push(args);
	r = s.scrub([args]);

	expected = {
		arguments: [[1,2,3,'[Circular]']]
	,	callbacks: {}
	,	links: [{from: ['0'], to: ['0','3']}]
	}
	
	test.deepEqual(r.arguments,expected.arguments);
	test.deepEqual(r.links,expected.links);
	test.deepEqual(r,expected);
	test.finish();
}

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}

