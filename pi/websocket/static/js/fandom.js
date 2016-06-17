class FanDom
{
	constructor(fanid, parent)
	{
		this.fanid = fanid;
		if(typeof(parent) == 'string')
			parent = $('#' + parent);
		this.parent = parent;
		var domstr = `
		<div id="${fanid}" class="fan-container">
			<div class="fan-upper">
				<div class="fan-icon">

				</div>
				<div class="fan-graph">

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
	}
}
