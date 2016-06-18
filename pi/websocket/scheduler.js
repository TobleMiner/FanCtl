class LinearScheduler
{
	constructor()
	{
		this.queue = [];
	}

	enqueue(func, ctx)
	{
		this.queue.push({ctx: ctx, func: func});
	}

	execute(callback, data, ctx)
	{
		this.enqueue(function()
		{
			callback.call(ctx ? ctx : this, data);
		});
		this.runNext(this);
	}

	runNext(scheduler)
	{
		var exec = scheduler.queue.shift();
		exec.func.call(exec.ctx ? exec.ctx : this, function(scheduler)
		{
			scheduler.runNext(scheduler);
		}, scheduler);
	}
}

module.exports = LinearScheduler;
