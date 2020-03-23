<?php

namespace Caliban\Components\Output;

class JsonStringOutput implements OutputInterface {
	public static function load($array) {
		return json_encode($array, JSON_NUMERIC_CHECK);
	}
}