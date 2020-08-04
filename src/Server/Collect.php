<?php

namespace Caliban\Server;

use Caliban\Abstracts\Singleton;

class Collect extends Singleton {

	/**
	 * @var \Caliban\Caliban
	 */
	private $tracker;

	/**
	 * @var array
	 */
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
	
	public function get_tracker() {
		return $this->tracker;
	}

	public function init() {
		try {
			$this->tracker = \Caliban\Caliban::get_instance();

			$parsed_data = $this->parse_data();

			// Set client URI which will never be the current request because that is the actual collection endpoint
			$this->tracker->set_url($parsed_data['url'] ?? $_SERVER['HTTP_REFERER']);

			// Set client referrer
			$this->tracker->set_referrer($parsed_data['urlref'] ?? "");

			if (!empty($parsed_data['sid'])) {
				$this->tracker->set_property_id($parsed_data['sid']);
			}

			if (!empty($parsed_data['ces'])) {
				$this->tracker->set_cache_expiration_seconds($parsed_data['ces']);
			}

			if (!empty($parsed_data['apnd'])) {
				$this->tracker->set_append_params(explode(",", $parsed_data['apnd']));
			}

			if (!empty($parsed_data['ignr'])) {
				$this->tracker->set_ignore_params(explode(",", $parsed_data['ignr']));
			}

			if (!empty($parsed_data['fattr'])) {
				$this->tracker->set_first_attribution_params(explode(",", $parsed_data['fattr']));
			}

			if (!empty($parsed_data['cmpst'])) {
				$this->tracker->set_campaign_start_params(explode(",", $parsed_data['cmpst']));
			}

			// Set the Session Reference Id when generated and passed back from the client
			if (!empty($parsed_data[CBN_SESSION_REFERENCE_KEY])) {
				$this->tracker->set_session_reference_id($parsed_data[CBN_SESSION_REFERENCE_KEY]);
			}

			// Set the linked Session Reference Id when generated and passed back from the client
			if (!empty($parsed_data['link_' . CBN_SESSION_REFERENCE_KEY])) {
				$this->tracker->link_session_reference_id($parsed_data['link_' . CBN_SESSION_REFERENCE_KEY]);
			}

			// Mark this as a brand new session if determined in tracker and passed in as `snew`.
			// Must pass a parameter for new session since the the cookie is already set, we may still be on the same domain
			// and referer is unreliable, so any assumptions could be wrong.
			if (isset($parsed_data['snew'])) {
				$this->tracker->set_new_session(filter_var($parsed_data['snew'], FILTER_VALIDATE_BOOLEAN));
			}

			// Set user Id if passed. There is no way to send a null/empty user Id as that shoul instead be a new session
			if (!empty($parsed_data['uid'])) {
				$this->tracker->set_user_id($parsed_data['uid']);
			}

			// Allow for any misc data properties to be set
			if (!empty($parsed_data['cdata']) && \Cig\is_json($parsed_data['cdata'])) {
				foreach(json_decode($parsed_data['cdata'], true) as $queued_prop => $queued_value) {
					$this->tracker->{$queued_prop} = $queued_value;
				}
			}

			// Save session
			$this->tracker->init()
			        ->save();

			//	Debug
//			header('X-Caliban-Response:' . $this->tracker->toJSON());

		} catch (\Exception $e) {
			header('X-Caliban-Error:' . $e->getMessage());
		}

		return $this;
	}

}