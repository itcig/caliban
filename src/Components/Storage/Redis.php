<?php

namespace Caliban\Components\Storage;

use \Caliban\Abstracts\Singleton;
use \Caliban\Components\Containers\SessionObject;

class Redis extends Singleton implements StorageInterface {

	protected $client;

	protected $errors;

	protected $cache_expiration_seconds;

	/**
	 * Redis constructor for Singleton declared as protected to prevent being called from outside this class
	 */
	protected function __construct() {
		$this->connect();
	}

	/**
	 * Establish Redis connection
	 */
	public function connect() {

		if (!defined('CBN_REDIS_SERVERS')) {
			throw new Exception("Redis server config missing");
		}

		try {
			$servers = explode(",", CBN_REDIS_SERVERS);
			$options = defined('CBN_REDIS_OPTIONS') ? CBN_REDIS_OPTIONS : [];

			$this->client = new \Predis\Client($servers, $options);
			$this->client->connect();

			// Not working
		} catch (\Predis\Connection\ConnectionException $e) {
			//        } catch (\Predis\CommunicationException $e) {
			$this->client = null;
			$this->errors[] = $e->getMessage();

			throw new \Exception($e->getMessage());

			// Not working
		} catch (\Exception $e) {
			$this->client = null;
			$this->errors[] = $e->getMessage();

			throw $e;
		}
	}

	/**
	 * @return \Predis\Client The Predis client object
	 */
	public function client() {
		return $this->client;
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
	 * @param \Caliban\Components\Containers\SessionObject $data Session container which is output as JSON
	 *
	 * @return bool True if saved
	 */
	public function save(string $id, string $context, SessionObject $data): bool {

		// Look for session data in Redis if enabled
		if (defined('CBN_REDIS_SERVERS') && !empty(CBN_REDIS_SERVERS)) {

			// Build Redis key using context and Id
			$redis_key = $context . "." . $id;

			// Store data in Redis
			$this->client->set($redis_key, $data->toJSON());

			// Set key expiration
			$this->client->expire($redis_key, $this->cache_expiration_seconds);

			// Return true if no errors thrown
			return true;
		}

		return false;
	}

	/**
	 * Fetch session data stored in Redis key. The response will be a single, scalar value.
	 *
	 * @param string $id The identifier of the session record
	 * @param string $context The database context where the the local cache data value is stored. Could be a database table or the prefix of a compound string key.
	 *
	 * @return string|null Stored session value
	 */
	public function load(string $id, string $context) : ?string {

		// Look for session data in Redis if enabled
		if (defined('CBN_REDIS_SERVERS') && !empty(CBN_REDIS_SERVERS)) {

			// Build Redis key using context and Id
			$redis_key = $context . "." . $id;

			$remote_cache_data = $this->client->get($redis_key);

			// Return unparsed data
			return $remote_cache_data;
		}

		return null;
	}
}
