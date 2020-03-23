<?php

namespace Caliban\Components\Storage;

use \Caliban\Abstracts\Singleton;
use \Caliban\Components\Containers\SessionObject;

class Local extends Singleton implements StorageInterface {

	protected $errors;

	/**
	 * Redis constructor for Singleton declared as protected to prevent being called from outside this class
	 */
	protected function __construct() {

	}

	/**
	 * @param int $seconds The seconds to preserve the cache key for
	 *
	 * @return Redis This class instance
	 */
	public function set_cache_expiration_seconds(int $seconds) {
		$this->cache_expiration_seconds = $seconds;

		return $this;
	}

	/**
	 * Save the session on a remote data source
	 *
	 * @param string $id The identifier of the session record
	 * @param string $context The database context where the the local cache data value will be stored. Could be a database table or the prefix of a compound string key.
	 * @param mixed $data Data to save
	 *
	 * @return bool True if saved
	 */
	public function save(string $id, string $context, SessionObject $data) {

		// Build Redis key using context and Id
		$storage_key = $context . "." . $id;

		try {
			$val = var_export($data, true);

			// HHVM fails at __set_state, so just use object cast for now
			$val = str_replace('stdClass::__set_state', '(object)', $data);

			// Write to temp file first to ensure atomicity
			$tmp = "/tmp/$storage_key." . uniqid('', true) . '.tmp';

			file_put_contents($tmp, '<?php $val = ' . $data . ';', LOCK_EX);
			rename($tmp, "/tmp/$storage_key");

			return true;

		} catch (Exception $e) {
			$this->errors[] = $e->getMessage();
		}

		return false;
	}

	/**
	 * Fetch session data stored in local key. The response will be the same PHP object type that was saved.
	 *
	 * @param string $id The identifier of the session record
	 * @param string $context The database context where the the local cache data value is stored. Could be a database table or the prefix of a compound string key.
	 *
	 * @return string|null Stored session value
	 */
	public function load(string $id, string $context) : ?string {

		// Build Redis key using context and Id
		$storage_key = $context . "." . $id;

		try {

			@include "/tmp/$storage_key";

			return isset($val) ? $val : false;

		} catch (Exception $e) {
			$this->errors[] = $e->getMessage();
		}

		return null;
	}
}
