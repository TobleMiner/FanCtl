class View
{
	update(model)
	{
		throw new Error('Not implemented');
	}

	destroy() { }
}

class ConnectionStateView extends View
{
	constructor()
	{
		super();
		this.indicator = document.getElementById('state-indicator');
	}

	showState(connected)
	{
		if(connected)
			this.indicator.innerText = 'Connection established ✓';
		else
			this.indicator.innerText = 'Connecting ...';
	}

	update(model)
	{
		this.showState(model.connected);
	}
}

class FanStateView extends View
{
	constructor(fanid)
	{
		super();
		this.fanid = fanid;
	}
}

class FanStateConsoleView extends FanStateView
{
	constructor(fanid)
	{
		super(fanid);
	}

	update(model)
	{
		var fan = model.getFan(this.fanid);
		console.log(this.fanid + ': dutycycle=' + fan.dutycycle + ' rpm=' + fan.rpm);
	}
}

class FanStateUiView extends FanStateView
{
	constructor(fanid, controller)
	{
		super(fanid);
		this.fandom = new FanDom(this.fanid, 'fans', controller);
		this.chart = new Chart(this.fandom.chart,
		{
			type: 'line',
			data: {
				datasets: [
					{
						label: 'PWM',
						data: [],
						borderColor: '#FF0000',
						fill: false,
						yAxisID: 'pwm'
					},
					{
						label: 'RPM',
						data: [],
						borderColor: '#00FF00',
						fill: false,
						yAxisID: 'rpm'
					}
				]
			},
			options: {
				scales: {
					xAxes: [{
						type: 'linear',
						position: 'bottom'
					}],
					yAxes: [{
						type: 'linear',
						id: 'pwm',
						ticks: {
							min: 0,
							max: 255,
							suggestedMax: 50
						}
					},
					{
						type: 'linear',
						id: 'rpm'/*,
						ticks: {
							min: 0
						}*/
					}]
				},
				responsive: true,
				maintainAspectRatio: false
			}
		});
		this.lastid = 0;
	}


	getFanDom()
	{
		return this.fandom;
	}

	destroy()
	{
		this.fandom.destroy();
	}

	update(model)
	{
		var fan = model.getFan(this.fanid);
		this.fandom.setPwm(fan.dutycycle);
		this.fandom.setRpm(fan.rpm);
		this.chart.config.data.datasets[0].data.push({x: this.lastid, y: fan.dutycycle});
		this.chart.config.data.datasets[1].data.push({x: this.lastid++, y: fan.rpm});
		if(this.chart.config.data.datasets[0].data.length >= 100)
		{
			this.chart.config.data.datasets[0].data.shift();
			this.chart.config.data.datasets[1].data.shift();
		}
		this.chart.update();
	}
}

class Model
{
	constructor()
	{
		this.connected = false;
		this.fans = {};
	}

	addFan(id)
	{
		this.fans[id] = new Fan(id);
	}

	getFan(id)
	{
		return this.fans[id];
	}
}

class Fan
{
	constructor(id, dutycycle=0, rpm=0)
	{
		this.id = id;
		this.dutycycle = dutycycle;
		this.rpm = rpm;
	}

	setRpm(rpm)
	{
		this.rpm = rpm;
	}

	setPwm(pwm)
	{
		this.dutycycle = pwm;
	}
}

class Controller
{
	constructor(socket, model)
	{
		this.socket = socket;
		this.model = model;
		this.views = [];
		this.server = null;
	}

	addView(view)
	{
		this.views.push(view);
		this.update();
	}

	removeView(view)
	{
		this.views.splice(this.views.indexOf(view), 1);
		view.destroy();
	}

	removeViewsByClass(clazz)
	{
		this.getViewsByClass(clazz).forEach(view => this.removeView(view));
	}

	getViewsByClass(clazz)
	{
		var views = []
		this.views.forEach(view => { if(view instanceof clazz) views.push(view); });
		return views;
	}

	update()
	{
		this.views.forEach(view => view.update(this.model));
	}

	onRpmSet(fanid, rpm)
	{
		var fan = this.model.getFan(fanid);
		fan.setRpm(rpm);
		this.socket.emit('setrpm', {'fanid' : fanid, 'rpm' : rpm});
	}

	onPwmSet(fanid, pwm)
	{
		var fan = this.model.getFan(fanid);
		fan.setPwm(pwm);
		this.socket.emit('setpwm', {'fanid' : fanid, 'pwm' : pwm});
	}

	connect()
	{
		this.model.connected = true;
		this.update();
	}

	disconnect()
	{
		this.model.connected = false;
		this.update();
	}

	initFans(init)
	{
		if(this.server != init.server)
		{
			console.log('Server instance changed! Reinitializing fans');
			this.removeViewsByClass(FanStateView);
			this.server = init.server;
			this.model.fans = {};
			init.fans.forEach(fanid => {
				this.model.addFan(fanid);
				//this.addView(new FanStateConsoleView(fanid));
				this.addView(new FanStateUiView(fanid, this));
			});
		}
		this.update();
	}

	updateFan(fan)
	{
		var localfan = this.model.fans[fan.uuid];
		localfan.setPwm(fan.dutycycle);
		localfan.setRpm(fan.rpm);
		this.update();
	}
}


$(document).ready(function()
{
	var socket = io.connect();
	model = new Model();
	controller = new Controller(socket, model);
	var view = new ConnectionStateView();
	controller.addView(view);

	socket.on('connect', function()
	{
		console.log("Connected");
		controller.connect();
	});

	socket.on('faninit', function(init)
	{
		controller.initFans(init);
	});

	socket.on('fanupdate', function(fan)
	{
		controller.updateFan(fan);
	});

	socket.on('disconnect', function()
	{
		console.log("Disconnected");
		controller.disconnect();
	});
});
