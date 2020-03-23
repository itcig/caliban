<?php

namespace Caliban\Server;

use Caliban\Abstracts\Singleton;
use mysql_xdevapi\Exception;

require_once(__DIR__ . '/../config.php');

class Collect extends Singleton {

	private $data;

	public function set_data($request_vars) {
		$this->data = $request_vars;
		return $this;
	}

	public function parse_data() {
		if (empty($this->data)) {
			return;
		}

		// Parse request vars for known Caliban config
		return $this->data;
	}

	public function init() {
		try {

			$caliban = \Caliban\Caliban::get_instance();

			$parsed_data = $this->parse_data();

			// Set client URI which will never be the current request because that is the actual collection endpoint
			$caliban->set_url($parsed_data['url'] ?? $_SERVER['HTTP_REFERER']);

			// Set client referrer
			$caliban->set_referrer($parsed_data['urlref'] ?? "");

			if (!empty($parsed_data['sid'])) {
				$caliban->set_property_id($parsed_data['sid']);
			}

			if (!empty($parsed_data['ces'])) {
				$caliban->set_cache_expiration_seconds($parsed_data['ces']);
			}

			if (!empty($parsed_data['apnd'])) {
				$caliban->set_append_params(explode(",", $parsed_data['apnd']));
			}

			// Set the Session Reference Id when generated and passed back from the client
			if (!empty($parsed_data[CBN_SESSION_REFERENCE_KEY])) {
				$caliban->set_session_reference_id($parsed_data[CBN_SESSION_REFERENCE_KEY]);
			}

			// Mark this as a brand new session if determined in tracker and passed in as `snew`
			if (isset($parsed_data['snew'])) {
				$caliban->set_new_session(filter_var($parsed_data['snew'], FILTER_VALIDATE_BOOLEAN));
			}

			$caliban->init()
			        ->save();

			//	Debug
//			header('X-Caliban-Response:' . $caliban->toJSON());

		} catch (Exception $e) {
			header('X-Caliban-Error:' . $e->getMessage());
		}
	}

}