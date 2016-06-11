<?php
	require_once('fanctl.php');
	$fanctl = new Fanctl(1, 42);
	if(array_key_exists('id', $_POST) && array_key_exists('dutycycle', $_POST))
	{
		$fanctl->set_duty_cycle(intval($_POST['id']), intval($_POST['dutycycle']));
	}
	if(array_key_exists('killall', $_POST))
	{
		for($i = 0; $i < $fanctl->numfans; $i++)
			 $fanctl->set_duty_cycle($i, 0);
	}
?>
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Fanctl</title>
	</head>
	<body>
		<table border="1">
		<tr>
			<th>
				Fan
			</th>
			<th>
				Speed
			</th>
			<th>
				Dutycycle
			</th>
			<th>

			</th>
		</tr>
		<?php foreach ($fanctl->get_all_fans() as $fan): ?>
		<form method="post">
		<tr>
			<td>
				<?=$fan->id?>
			</td>
			<td>
				<?=$fan->speed?>
			</td>
			<td>
				<input type="hidden" name="id" value="<?=$fan->id?>">
				<input type="number" name="dutycycle" min="0" max="255" value="<?=$fan->dutycycle?>">
			</td>
			<td>
				<input type="submit" value="Apply">
			</td>
		</tr>
		</form>
		<?php endforeach; ?>
		</table>
		<form method="post">
			<input type="hidden" name="killall" value="1">
			<input type="submit" value="Killall">
		</form>
	</body>
</html>
