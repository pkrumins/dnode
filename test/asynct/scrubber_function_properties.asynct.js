var Scrubber = require(__dirname + '/../../lib/scrubber');
var sys = require('sys');

exports['test function properties'] = function (test){
	s = new Scrubber();
	function a(){}
	function b(){}
	a.b = b
	//scrubber doesn't check if functions have properties.
	r = s.scrub([a]);

	test.deepEqual(r.callbacks,{'0':['0'],'1':['0','b']},"NOT IMPLEMENTED. scrubber doesn't check for function properties - 25 OCT 2010");
	test.deepEqual(r,{
		arguments: ['[Function]']
	,	callbacks: {
			'0' : ['0']
		,	'1' : ['0','b']
		}
	,	links: {}
	});
	
	test.finish();
}

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}

