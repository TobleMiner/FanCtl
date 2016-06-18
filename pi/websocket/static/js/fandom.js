class FanDom
{
	constructor(fanid, parent, controller)
	{
		this.fanid = fanid;
		if(typeof(parent) == 'string')
			parent = $('#' + parent);
		this.parent = parent;
		this.controller = controller;
		var domstr = `
		<div id="${fanid}" class="fan-container">
			<div class="fan-upper">
				<div class="fan-icon" title="${fanid}">
				</div>
				<div class="fan-graph">
					<canvas id="${fanid}-chart"></canvas>
				</div>
			</div>
			<div class="fan-lower">
				<div class="fan-controls">
					<input id="${fanid}-rpm" type="number" name="name" value="0">
					<input id="${fanid}-pwm" type="range" name="name" min="0" max="255" value="0">
				</div>
				<div class="fan-key">
					<h3>Speed</h3>
					<h3>Duty cycle</h3>
				</div>
			</div>
		</div>
		`;
		parent.append(domstr);
		this.root = $('#' + fanid);
		this.rpm = $('#' + fanid + '-rpm');
		this.pwm = $('#' + fanid + '-pwm');
		this.chart = $('#' + fanid + '-chart');
		this.rpm.bind('change', {'controller' : controller, 'fanid' : fanid}, function(event)
		{
			event.data.controller.onRpmSet(event.data.fanid, event.target.value);
		});
		this.pwm.bind('change', {'controller' : controller, 'fanid' : fanid}, function(event)
		{
			event.data.controller.onPwmSet(event.data.fanid, event.target.value);
		});
	}

	setRpm(rpm)
	{
		this.rpm.val(rpm);
	}

	setPwm(pwm)
	{
		this.pwm.val(pwm);
	}

	destroy()
	{
		this.root.remove();
		this.root = null;
		this.rpm = null;
		this.pwm = null;
		this.chart = null;
	}
}
