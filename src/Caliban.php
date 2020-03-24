<?php

// declare(strict_types=1);

namespace Caliban;

use \Caliban\Abstracts\Singleton;
use \Caliban\Components\Containers\StorageOptions;
use \Caliban\Components\Containers\SessionObject;
use \Caliban\Components\Output\JsonStringOutput;
use \Caliban\Components\Output\ArrayOutput;

use \Caliban\Components\Storage\StorageInterface;
use \Caliban\Components\Storage\Redis;

use \Caliban\Client\Client;
use \Caliban\Server\Server;

require_once (__DIR__ . '/../vendor/autoload.php');

require_once(__DIR__ . '/config.php');

class Caliban extends Singleton {

	// TODO: Move these all to config
	const SESSION_REFERENCE_KEY = CBN_SESSION_REFERENCE_KEY;

	const DEFAULT_CACHE_KEY = CBN_DEFAULT_CACHE_KEY;

	// These have special uses and cannot be modified by any config
	const STATIC_USE_PARAMS = ['gauid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

	private $client_uri;

	private $client_referrer;

	private $client_ip;

	private $client_user_agent;

	private $property_id;

	private $append_params;

	private $ignore_params;

	private $first_attribution_params;

	private $last_attribution_params;

	private $cache_key;

	private $cache_expiration_seconds;

	private $session_reference_id;

	private $is_new_session;

	/**
	 * @var StorageInterface The databae used to save session
	 */
	private $storage_db;

	/**
	 * @var SessionObject The current session data
	 */
	private $state;

	/**
	 * @var SessionObject The session data on page load
	 */
	private $prev_state;

	/**
	 * @var SessionObject The current session data
	 */
	private $debug_state;

	/**
	 * @var StorageOptions Data used for storage container
	 */
	private $storage_options;

	/**
	 * Caliban constructor
	 */
	public function __construct($session_reference_id = null) {
		// Load defaults for any properties not explicitly set
		$this->set_defaults();

		if ($session_reference_id) {
			$this->set_session_reference_id($session_reference_id);

			$this->state = $this->load_session();
		}
	}

	/**
	 * The key used for caching data value
	 *
	 * @param string $key
	 *
	 * @return Caliban This class instance
	 */
	public function set_cache_key ($key): Caliban {
		$this->cache_key = $key;

		return $this;
	}

	/**
	 * @param string $url The current URL being tracked
	 *
	 * @return Caliban This class instance
	 */
	public function set_url ($url): Caliban {
		$this->client_uri = $url;

		return $this;
	}

	/**
	 * @param string $url The referrer this request came from if available
	 *
	 * @return Caliban This class instance
	 */
	public function set_referrer ($url): Caliban {
		$this->client_referrer = $url;

		return $this;
	}

	/**
	 * @param string $url Override the IP address of the current request
	 *
	 * @return Caliban This class instance
	 */
	public function set_client_ip ($ip_address): Caliban {
		$this->client_ip = $ip_address;

		return $this;
	}

	/**
	 * @param string $user_agent Override the user-agent of the current request
	 *
	 * @return Caliban This class instance
	 */
	public function set_user_agent ($user_agent): Caliban {
		$this->client_user_agent = $user_agent;

		return $this;
	}

	public function set_property_id(string $property_id): Caliban {
		$this->property_id = $property_id;

		return $this;
	}

	/**
	 * @param string $session_reference_id Explicitly pass in the session Id if say it was generated on the client side and we're not yet able to read the cookie in PHP
	 *
	 * @return Caliban This class instance
	 */
	public function set_session_reference_id(string $session_reference_id): Caliban {
		$this->session_reference_id = $session_reference_id;

		return $this;
	}

	/**
	 * @param array $keys List of keys we should append to all outbound links and forms if found in the request
	 *
	 * @return Caliban This class instance
	 */
	public function set_append_params(array $keys): Caliban {
		$this->append_params = $keys;

		return $this;
	}

	/**
	 * Merge passed in ignore params with defaults that are utilitarian and we never want to store
	 *
	 * @param array $keys List of keys we should ignore in session cache if found in the request
	 *
	 * @return Caliban This class instance
	 */
	public function set_ignore_params(array $keys): Caliban {
		$this->ignore_params = array_merge($this->ignore_params, $keys);

		return $this;
	}

	/**
	 * @param int $seconds The seconds to preserve the cache key for
	 *
	 * @return Caliban This class instance
	 */
	public function set_cache_expiration_seconds(int $seconds): Caliban {
		$this->cache_expiration_seconds = $seconds;

		return $this;
	}

	/**
	 * @param bool $is_new Whether this is a new session since the referrer and cookie being set could be unreliable by the time we save the session
	 *
	 * @return Caliban This class instance
	 */
	public function set_new_session (bool $is_new): Caliban {
		$this->is_new_session = $is_new;

		return $this;
	}

	/**
	 * @param array $options Key-value pairs to add to strorage options container
	 *
	 * @return Caliban This class instance
	 */
	public function set_storage_options(array $options = []): Caliban {
		$this->storage_options->fromArray($options);

		return $this;
	}

	/**
	 * Set defaults for anything not explicitly passed or found in the ENV
	 */
	private function set_defaults(): void {

		// Assume a continuation of existing session unless passed as new.
		$this->is_new_session = false;

		// Requesting URL
		if (empty($this->client_uri)) {
			$this->client_uri = $_SERVER['REQUEST_URI'] ?? "";
		}

		// Referring URL
		if (empty($this->client_referrer)) {
			$this->client_referrer = $_SERVER['HTTP_REFERER'] ?? "";
		}

		// List of keys in request querystring that are allowed to write to session cache
		if (empty($this->append_params)) {
			$this->append_params = defined('APPEND_PARAMS') ? APPEND_PARAMS : [];
		}

		// List keys we should ignore in session cache if found in the request
		if (empty($this->ignore_params)) {
			$this->ignore_params = defined('IGNORE_PARAMS') ? IGNORE_PARAMS : [];
		}

		// Default list of params that are always first attribution without exception
		if (empty($this->first_attribution_params)) {
			$this->first_attribution_params = defined('FIRST_ATTRIBUTION_PARAMS') ? FIRST_ATTRIBUTION_PARAMS : [];
		}

		// We will populate this during init()
		$this->last_attribution_params = [];

		// Client IP Address
		if (empty($this->client_ip)) {
			$this->client_ip = \Cig\get_client_ip();
		}

		// Client User-Agent
		if (empty($this->client_user_agent)) {
			$this->client_user_agent = \Cig\get_user_agent();
		}

		if (empty($this->cache_key)) {
			$this->cache_key = self::DEFAULT_CACHE_KEY;
		}

		// Fallback to ENV if set, otherwise null and session data never expires
		if (empty($this->cache_expiration_seconds)) {
			$this->cache_expiration_seconds = defined('CBN_CACHE_EXPIRATION') ? CBN_CACHE_EXPIRATION : null;

			// TODO: Log warning if setting non-expiring cache. This should be allowed but only if well thought out and not by mistake
		}
	}

	/**
	 * Build an array of params that are not defined with static use cases, are not locked to first attribution only and are not ignored
	 */
	private function set_last_attribution_params(): void {
		// Build remainder of client query vars that are not ignored or set to first attribution
		$last_attribution_filter_out_keys = array_merge(self::STATIC_USE_PARAMS,$this->first_attribution_params ?? [], $this->ignore_params ?? []);

		foreach ($this->get_client_query_vars() as $available_query_key => $available_query_var) {
			if (!in_array($available_query_key, $last_attribution_filter_out_keys)) {
				$this->last_attribution_params[$available_query_key] = $available_query_var;
			}
		}
	}

	private function init_storage(): void {
		// Set storage engine for saving sessions
		// TODO: Make this dynamic so it can be passed
		$this->storage_db = Redis::get_instance()->set_cache_expiration_seconds($this->cache_expiration_seconds);
	}

	/**
	 * @return Caliban This class instance
	 */
	public function init(): Caliban {

		// Initialize storage engine
		$this->init_storage();

		// Load cache data from existing session if exists
		$cache_data = $this->load_session($this->cache_key) ?? "";

		// Load previously stored cache data as previous state
		$prev_state = SessionObject::fromString($cache_data);

		// Set previous state on class
		$this->prev_state = $prev_state;

		// Set up new session state starting from the previous state
		$session_state = SessionObject::fromObject($prev_state);

		// Get passed params which are not designated for other purposes nor suppressed from tracker
		$this->set_last_attribution_params();

		// TODO: Parse inbound data to see if we can deduce Google/Bing/etc... when referrer is missing

		if (CBN_DEBUG) {
			$this->debug_state = SessionObject::fromArray([
				'_id' => $this->get_session_reference_id(),
				'session_refrence_key' => self::SESSION_REFERENCE_KEY,
				'cookied_session_id' => $this->get_client_cookie_value(self::SESSION_REFERENCE_KEY),
				'uri' => $this->client_uri,
				'referrer' => $this->client_referrer,
				'is_session_landing_page' => $this->is_session_landing_page(),
				'new_session_test_1' => empty($this->get_client_querystring_value(self::SESSION_REFERENCE_KEY)),
                'new_session_test_2' => (empty($this->get_client_cookie_value(self::SESSION_REFERENCE_KEY)) || $this->is_new_session),
				'ignore_params' => $this->ignore_params,
				'append_params' => $this->append_params,
				'first_attribution_params' => $this->first_attribution_params,
				'last_attribution_params' => $this->last_attribution_params,
				'client_query_vars' => $this->get_client_query_vars(),
				'cookies' => array_keys($_COOKIE),
			]);
		}

		//***********************************************************************************
		//******* FIRST INSTANCE: The following items mutate only on inbound requests *******
		//***********************************************************************************

		// If request is coming from an outside domain and has no reference Id passed
		// This includes a return visit from an outside link or email even within the same session
		if ($this->is_session_landing_page()) {

			// Add referrer
			$session_state->referrer = $this->client_referrer;

			// Add current URI as the original page
			$session_state->landing_uri = $this->client_uri;
			
			// Check if GA UserId is already set
			if (empty($prev_state->gauid)) {
				// generate a new anonymous Id if no user is found
				$session_state->gauid = $this->get_client_value('gauid', 'a_' . time() . mt_rand(1000000, 9999999));
			}

			// List of allowed UTM parameters
			$utm_params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

			// Default values for UTM following the standards set by Google Analytics to avoid null values
			$default_utm_values = [
				'utm_source' => '(direct)',
				'utm_medium' => '(none)',
				'utm_campaign' => '(not set)',
				'utm_content' => '(not set)',
				'utm_term' => '(not set)',
			];

			// Add each UTM parameter with fallback to default string
			foreach($utm_params as $utm_key) {
				if (!in_array($utm_key, $this->ignore_params)) {
					$session_state->{$utm_key} = $this->get_client_value($utm_key, $default_utm_values[$utm_key]);
				}
			}

			// Add remaining "first attribution" items and then ignore so they are not added on subsequent requests
			foreach ($this->first_attribution_params as $first_attribution_param) {
				$session_state->{$first_attribution_param} = $this->get_client_value($first_attribution_param);
			}
		}

		//**************************************************************************
		//******* LAST INSTANCE: The following items mutate on every request *******
		//**************************************************************************

		// Set IP address on every request
		$session_state->ip = $this->client_ip;

		// Set User-Agent
		$session_state->ua = $this->client_user_agent;

		// Set last URL visited
		$session_state->last_uri = $this->client_uri;

		// Loop through last attribution keys and add/update
		foreach ($this->last_attribution_params as $last_attribution_param) {
			$session_state->{$last_attribution_param} = $this->get_client_value($last_attribution_param);
		}

		// NOTE: Unsure if this is needed at this point with current first/last attribution rules. Possibly limit the fields saved here to keep size down?
		// Set `original` key on state if not set
		// If session is brand new, this will equal the session values
		// If session is recalled from storage it will either already have `original` key and use that or create a new one
//		if (empty($session_state->original)) {
//			$session_state->original = $session_state->toArray();
//		}

		// Set state
		$this->state = $session_state;

		return $this;
	}

	/**
	 * @return Caliban This class instance
	 */
	public function save(): Caliban {

//		// Get session object as JSON string
//		$json_session_data = $this->state->output(new JsonStringOutput);

		// Store session in configured storage
		$this->save_session($this->cache_key, $this->state);

		// Store debug session
		if (CBN_DEBUG) {
			$this->save_session("__debug__" . $this->cache_key, $this->debug_state);
		}

		return $this;
	}

	public function toJSON() {

		return $this->state->output(new JsonStringOutput);
	}

	public function toArray() {

		return $this->state->output(new ArrayOutput);
	}

	/**
	 * @return Caliban This class instance
	 */
	public function response() {

		print $this->state->output(new JsonStringOutput);
	}

	/**
	 * Load saved session data from datasource
	 *
	 * @param string $key The key containing the cache data value
	 *
	 * @return string|null Session data
	 */
	public function load_session(string $key) : ?string {

		$cache_data = $this->storage_db->load($this->get_session_reference_id(), $key);

		return $cache_data;
	}

	/**
	 * Save the session
	 *
	 * @param string $key The key to store the cache data value
	 * @param \Caliban\Components\Containers\SessionObject $data JSON encoded data
	 *
	 * @return bool True if saved
	 */
	public function save_session(string $key, SessionObject $data) : bool {

		// Store session reference Id in a cookie regardless so we can recall this session if the client closes their browsers and returns prior to cache expiration
		setcookie(self::SESSION_REFERENCE_KEY, $this->get_session_reference_id(), time() + $this->cache_expiration_seconds, "/", \Cig\get_root_domain());

		// Make cookie available for this request
		$_COOKIE[self::SESSION_REFERENCE_KEY] = $this->get_session_reference_id();

		// Try to save in storage DB
		if ($this->storage_db->save($this->get_session_reference_id(), $key, $data)) {
			return true;
		}

		return false;
	}

	/**
	 * Get a session reference Id to recall saved data later. If no reference Id is found then create one which is a unique string.
	 *
	 * @return string The unique reference Id
	 */
	public function get_session_reference_id() : string {

		if (!empty($this->session_reference_id)) {
			return $this->session_reference_id;
		}

		// Attempt to retrieve existing cigsession reference Id
		$session_reference_id = $this->get_client_value(self::SESSION_REFERENCE_KEY);

		// Build unique session identifier if not found
		if (!$session_reference_id) {
			$session_reference_id = bin2hex(version_compare(phpversion(), '7.0.0') >= 0
				? random_bytes(10)
				: openssl_random_pseudo_bytes(10)
			);
		}

		// Set reference Id
		$this->session_reference_id = $session_reference_id;

		// Return the Id
		return $session_reference_id;
	}

	/**
	 * Check if the client URL is from an outside referrer and also there is no session reference Id.
	 * If client arrives from another domain but pass a reference Id then consider this a continuation of the session.
	 */
	private function is_session_landing_page() {

		// To consider this the start of a new session:
		// 1. The SESSION_REFERENCE_KEY was not passed in URL meaning we came from a session started on another domain
		// 2. We do not have a session reference Id stored in a cookie AND not explictly marked as `new` which would indicate a client session just begain on the JS tracker
		return empty($this->get_client_querystring_value(self::SESSION_REFERENCE_KEY)) &&
		       (empty($this->get_client_cookie_value(self::SESSION_REFERENCE_KEY)) ||
		        $this->is_new_session);

		// Previously was checking for referrer different from URI
		// return empty($this->get_client_querystring_value(self::SESSION_REFERENCE_KEY)) && $this->is_outside_referrer();
	}

	/**
	 * Check if session referrer is from a different domain that the client request
	 *
	 * TODO: What do we want to do if referrer is blank?
	 *
	 * @return bool True if domain does not match
	 */
	private function is_outside_referrer() {

		return !\Cig\is_same_root_domain($this->client_referrer, $this->client_uri);
	}

	/**
	 * @param string $key Lookup the key in the requesting URL, followed by the client cookies
	 * @param mixed|null $default_value The value to return if null
	 *
	 * @return string|null
	 */
	private function get_client_value(string $key, $default_value = null) : ?string {
		return $this->get_client_querystring_value($key) ?? $this->get_client_cookie_value($key) ?? $default_value;
	}

	/**
	 * Get array of values from client querystring
	 *
	 * @return array
	 */
	private function get_client_query_vars() : array {

		// Parse client querystring if not done
		if (strpos($this->client_uri, "?") &&
		    empty($this->client_params)) {

			$this->client_params = \Cig\parse_querystring($this->client_uri);
		}

		return $this->client_params ?? [];
	}

	/**
	 * @param string $key Get value from client querystring
	 *
	 * @return string|null
	 */
	private function get_client_querystring_value(string $key) : ?string {

		$query_vars = $this->get_client_query_vars();

		return $query_vars[$key] ?? null;
	}

	/**
	 * @param string $key The cookie name to find
	 *
	 * @return string|null
	 */
	private function get_client_cookie_value(string $key) : ?string {

		// OLD CODE FROM PRIOR SESSION TRACKER WHERE COOKIESTR WAS PASSED IN URL
//		// Try to retrieve a cookie string passed in the URL if our key exists in the cookie string
//		if ($this->get_client_querystring_value('cookies')) {
//			$cookie_str = $this->get_client_querystring_value('cookies');
//
//			if (strpos($cookie_str, $key) !== false) {
//				$passed_cookies = explode("=", explode("; ", $cookie_str) ?? []);
//			}
//		}
//
//		// Merge cookies available to the serve with any found in the URL
//		$cookies = array_merge($_COOKIE, $passed_cookies ?? []);
//
//		$response_value = null;
//
//		foreach ($cookies as $cookie_key => $cookie_val) {
//
//			// Check both key and private variable naming conventions
//			if (ltrim($cookie_key, "_") === $key) {
//
//				$response_value = urldecode($cookie_val);
//				break;
//			}
//		}
//
//		return $response_value;

		return $_COOKIE[$key] ?? null;
	}

	/**
	 * Start a Caliban client instance
	 */
	public function client(): Client {
		return Client::get_instance();
	}

	/**
	 * Start a Caliban server instance
	 */
	public function server(): Server {
		return Server::get_instance()->run();
	}
}
