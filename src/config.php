<?php

/**
 * @var string Directory containing all of the site's files
 */
$root_dir = dirname(__DIR__);

/**
 * Expose global env() function from oscarotero/env
 */
\Env::init();

/**
 * Use Dotenv to set required environment variables and load .env file in root of Caliban application for debugging
 */
$dotenv = \Dotenv\Dotenv::createImmutable($root_dir);
if (file_exists($root_dir . '/.env')) {
	$dotenv->load();
}

// TODO: Make this dynamically read off whether the cigsession_chrome plugin is enabled
if (!defined('CBN_DEBUG')) {
	define('CBN_DEBUG', env('CBN_DEBUG') ?? false);
}

/**
 * Cookie and tracking variable settings
 */
if (!defined('CBN_SESSION_REFERENCE_KEY')) {
	define('CBN_SESSION_REFERENCE_KEY', env('CBN_SESSION_REFERENCE_KEY') ?? "_cbnsid");
}

if (!defined('CBN_DEFAULT_CACHE_KEY')) {
	define('CBN_DEFAULT_CACHE_KEY', env('CBN_DEFAULT_CACHE_KEY') ?? "cbn");
}

/**
 * Redis connection
 * Stored as strings so this can be offloaded to ENV
 */
if (!defined('CBN_REDIS_SERVERS')) {
	define('CBN_REDIS_SERVERS', env('CBN_REDIS_SERVERS') ?? null);
}

if (!defined('CBN_REDIS_OPTIONS') && Cig\is_json(env('CBN_REDIS_OPTIONS'))) {
	define('CBN_REDIS_OPTIONS', json_decode(env('CBN_REDIS_OPTIONS'), true));
}

if (!defined('CBN_CACHE_EXPIRATION')) {
	define('CBN_CACHE_EXPIRATION', 2 * 60 * 60); // 2 hours
}

/**
 * Append data to outbound links and forms
 */

// Allow setting array of params to append to all links and outbound URLs
if (!defined('CBN_APPEND_PARAMS') && !empty(env('CBN_APPEND_PARAMS'))) {
	// Convert to an array
	$append_params = explode(",", env('CBN_APPEND_PARAMS'));

	// Remove whitespace
	array_walk($append_params, 'trim');

	define('CBN_APPEND_PARAMS', $append_params);
}

/**
 * Suppress tracking of unecessary params
 */

// Allow setting array of params to ignore from tracking data, otherwise use defaults
if (!defined('CBN_IGNORE_PARAMS') && !empty(env('CBN_IGNORE_PARAMS'))) {
	// Convert to an array
	$ignore_params = explode(",", env('CBN_IGNORE_PARAMS'));

	// Remove whitespace
	array_walk($ignore_params, 'trim');

	define('CBN_IGNORE_PARAMS', $ignore_params);
}


/**
 * First attribution params
 */
if (!defined('CBN_FIRST_ATTRIBUTION_PARAMS') && !empty(env('CBN_FIRST_ATTRIBUTION_PARAMS'))) {
	// Convert to an array
	$first_attribution_params = explode(",", env('CBN_FIRST_ATTRIBUTION_PARAMS'));

	// Remove whitespace
	array_walk($first_attribution_params, 'trim');

	define('CBN_FIRST_ATTRIBUTION_PARAMS', $first_attribution_params);
}

/**
 * Campaign start params
 */
if (!defined('CBN_CAMPAIGN_START_PARAMS') && !empty(env('CBN_CAMPAIGN_START_PARAMS'))) {
	// Convert to an array
	$campaign_start_params = explode(",", env('CBN_CAMPAIGN_START_PARAMS'));

	// Remove whitespace
	array_walk($campaign_start_params, 'trim');

	define('CBN_CAMPAIGN_START_PARAMS', $campaign_start_params);
}