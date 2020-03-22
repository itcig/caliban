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
define('CBN_DEBUG', env('CBN_DEBUG'));

/**
 * Cookie and tracking variable settings
 */
define('CBN_SESSION_REFERENCE_KEY', env('CBN_SESSION_REFERENCE_KEY') ?? "_cbnsid");
define('CBN_DEFAULT_CACHE_KEY', env('CBN_DEFAULT_CACHE_KEY') ?? "cbn");

/**
 * Redis connection
 * Stored as strings so this can be offloaded to ENV
 */
define('CBN_REDIS_SERVERS', env('CBN_REDIS_SERVERS'));

if (Cig\is_json(env('CBN_REDIS_OPTIONS'))) {
	define('CBN_REDIS_OPTIONS', json_decode(env('CBN_REDIS_OPTIONS'), true));
}

define('CBN_CACHE_EXPIRATION', 2 * 60 * 60); // 2 hours


/**
 * Append data to outbound links and forms
 */

// Allow setting array of params to append to all links and outbound URLs
if (!empty(env('CBN_APPEND_PARAMS'))) {
	// Convert to an array
	$append_params = explode(",", env('CBN_APPEND_PARAMS'));

	// Remove whitespace
	array_walk($append_params, 'trim');

	define('APPEND_PARAMS', $append_params);
}

/**
 * Suppress tracking of unecessary params
 */

// Allow setting array of params to ignore from tracking data, otherwise use defaults
if (!empty(env('CBN_IGNORE_PARAMS'))) {
	// Convert to an array
	$ignore_params = explode(",", env('CBN_IGNORE_PARAMS'));

	// Remove whitespace
	array_walk($ignore_params, 'trim');

	define('IGNORE_PARAMS', $ignore_params);
}


/**
 * First attribution params
 */
if (!empty(env('CBN_FIRST_ATTRIBUTION_PARAMS'))) {
	// Convert to an array
	$first_attribution_params = explode(",", env('CBN_FIRST_ATTRIBUTION_PARAMS'));

	// Remove whitespace
	array_walk($first_attribution_params, 'trim');

	define('FIRST_ATTRIBUTION_PARAMS', $first_attribution_params);
}
