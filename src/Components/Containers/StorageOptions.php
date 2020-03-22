<?php

namespace Caliban\Components\Containers;

use \Caliban\Components\Output\OutputInterface;
use \Caliban\Components\Output\ArrayOutput;

class StorageOptions implements ContainerInterface {

	/*
	 * @var array Used for overloading properties
	 */
	private $data = [];

	protected function __construct() {

	}

	/**
	 * Check if an overloaded property is set
	 *
	 * @param string $name Overloaded property to check
	 *
	 * @return bool True if exists
	 */
	public function __isset(string $name) {
		return isset($this->data[$name]);
	}

	/**
	 * Remove an overloaded property
	 *
	 * @param string $name Overloaded property to remove
	 */
	public function __unset(string $name) {
		unset($this->data[$name]);
	}

	/**
	 * Retrieve the value of an overloaded property
	 *
	 * @param string $name Property name
	 *
	 * @return mixed|null The value of the property
	 */
	public function __get(string $name) {
		return $this->data[$name] ?? null;
	}

	/**
	 * Set overloaded properties only if previously not set
	 *
	 * @param string $name Property name
	 * @param mixed|null $val Property value
	 */
	public function __set(string $name, $val = null) : void {

		// Do not set null values
		if (!$val) {
			return;
		}

		// If property doesn't exist then set it
		if (!isset($this->data[$name])) {
			$this->data[$name] = $val;
		}

		return;
	}

	public static function fromObject(StorageOptions $obj) {
		$instance = clone $obj;
		return $instance;
	}

	public static function fromArray(array $options) {

		$instance = new self;

		foreach($options as $option_key => $option_val) {
			$instance->push($option_key, $option_val);
		}

		return $instance;
	}

	/**
	 * Add items to an associative array property without mutating exisitng keys
	 *
	 * @param string $key
	 * @param array $data
	 */
	public function push(string $key, array $data) : void {

		// Retrieve existing property data or create new array
		$curr_value = $this->data[$key] ?? [];

		if (!is_array($curr_value)) {
			return;
		}

		// Merge array in a way that we don't replace keys, only add new ones
		$new_data = array_merge($data, $curr_value);

		// Add to key if data is not empty
		if (!empty($new_data)) {
			$this->data[$key] = $new_data;
		}
	}

	/**
	 * @param OutputInterface|null $outputType
	 *
	 * @return mixed
	 */
	public function output(OutputInterface $outputType = null) {

		// Default is to return an array
		return $outputType
			? $outputType::load($this->data)
			: (new ArrayOutput)::load($this->data);
	}
}
