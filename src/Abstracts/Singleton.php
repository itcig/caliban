<?php

namespace Caliban\Abstracts;

abstract class Singleton {

	private static $instances = array();

	protected function __construct() {}

	public static function get_instance() {

		$class = get_called_class();

		if (!isset(self::$instances[$class])) {
			self::$instances[$class] = new static();
		}

		return self::$instances[$class];
	}

	/**
	 * Singletons are not cloneable.
	 */
	protected function __clone() { }

	/**
	 * Singletons should not be restorable from strings
	 */
	public function __wakeup() {
		throw new \Exception("Cannot unserialize a singleton.");
	}
}