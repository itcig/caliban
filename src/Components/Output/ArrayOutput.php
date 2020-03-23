<?php

namespace Caliban\Components\Output;

class ArrayOutput implements OutputInterface {
	public static function load($array) {
		return $array;
	}
}