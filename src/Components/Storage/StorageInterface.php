<?php

namespace Caliban\Components\Storage;

use \Caliban\Components\Containers\SessionObject;

interface StorageInterface {

	/**
	 * Save the session on a remote data source
	 *
	 * @param string $id The identifier of the session record
	 * @param string $context The database context where the the local cache data value will be stored. Could be a database table or the prefix of a compound string key.
	 * @param string $data JSON encoded data
	 *
	 * @return bool True if saved
	 */
	public function save(string $id, string $context, SessionObject $data);


	/**
	 * Fetch session data stored. The response will be a single, scalar value.
	 *
	 * @param string $id The identifier of the session record
	 * @param string $context The database context where the the local cache data value is stored. Could be a database table or the prefix of a compound string key.
	 *
	 * @return string|null Stored session value
	 */
	public function load(string $id, string $context) : ?string;
}