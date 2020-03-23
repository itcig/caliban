<?php

namespace Caliban\Components\Containers;

use \Caliban\Components\Output\OutputInterface;
use \Caliban\Components\Output\JsonStringOutput;
use \Caliban\Components\Output\ArrayOutput;

class SessionObject implements ContainerInterface {

	/**
	 * @var OutputInterface The default output formatter if none passed
	 */
	private $default_output_type;

	/*
	 * @var array Used for overloading properties
	 */
	private $data = [];

	protected function __construct() {

		// Default output is JSON
		$this->default_output_type = new JsonStringOutput;
	}

	public static function fromString(string $data = null) {
		$instance = new self();
		$instance->loadByString($data);
		return $instance;
	}

	public static function fromArray(array $data) {
		return self::fromString(json_encode($data, JSON_NUMERIC_CHECK));
	}

	public static function fromObject(SessionObject $obj) {
		$instance = clone $obj;
		return $instance;
	}

	private function loadByString(string $data) {

		// Try to populate an array of key/values from passed data
		$data_array = [];

		// Check for valid JSON
		if (\Cig\is_json($data)) {

			// Parse JSON into an associative array
			$data_array = json_decode($data, true);

		// Check for valid Hex
		} else if (ctype_xdigit($data)) {

			try {
				// Convert hex back to a string
				$bin_val = hex2bin($data);

				// If decoded string is valid JSON, parse into an associative array
				if (\Cig\is_json($bin_val)) {
					$data_array = json_decode($bin_val, true);
				}

			} catch (\Throwable $e) {
				// hex2bin will thrown a warning if it fails so catch and ignore
			}
		}

		// Convert all key/value pairs into properties of this container
		foreach ($data_array as $key => $value) {
			$this->data[$key] = $value;
		}
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
	 * Set or update overloaded properties
	 *
	 * @param string $name Property name
	 * @param mixed|null $val Property value
	 */
	public function __set(string $name, $val = null) : void {

		// Do not set null values
		if (is_null($val)) {
			return;
		}

		// If property doesn't exist then set it
//		if (!isset($this->data[$name])) {
			$this->data[$name] = $val;
//		}

		return;
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

		// Default is to return JSON
		return $outputType
			? $outputType::load($this->data)
			: $this->default_output_type::load($this->data);
	}

	/**
	 * @return array
	 */
	public function toArray() {
		return $this->output(new ArrayOutput);
	}

	/**
	 * @return array
	 */
	public function toJSON() {
		return $this->output(new JsonStringOutput());
	}

	/**
	 * Return the object as a JSON string
	 *
	 * @return false|string
	 */
	public function __toString() {
		return $this->toJSON();
	}
}
