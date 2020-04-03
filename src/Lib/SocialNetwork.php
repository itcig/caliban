<?php

namespace Caliban\Lib;

use \Caliban\Abstracts\Singleton;

class SocialNetwork extends Singleton {

	/** @var string location of definition file (built from matomo/searchengine-and-social-list) */
	const DEFINITION_FILE = __DIR__ . '/../Data/SocialNetworks.yml';

	protected $definition_list = null;

	/**
	 * Returns list of social networks by URL
	 *
	 * @return array  Array of ( URL => array( searchEngineName, keywordParameter, path ) )
	 */
	private function get_definitions() {
		// Load definitions if not set
		if (empty($this->definition_list)) {
			$social_networks = \Spyc::YAMLLoad(self::DEFINITION_FILE);

			$url_to_name = array();
			foreach ($social_networks as $name => $urls) {
				if (empty($urls) || !is_array($urls)) {
					continue;
				}

				foreach ($urls as $url) {
					$url_to_name[$url] = $name;
				}
			}
			return $url_to_name;

			$this->definition_list = $url_to_info;
		}

		return $this->definition_list;
	}

	/**
	 * Attempt to identify traffic from a social network based on the referrer URL
	 *
	 * The function returns false when a network cannot be foundd	 *
	 *
	 * @param string $referrer_url URL referrer URL, eg. $_SERVER['HTTP_REFERER']
	 *
	 * @return array|bool   false if a keyword couldn't be extracted,
	 *                        or array(
	 *                            'name' => 'Facebook'
	 *                          )
	 */
	public function extract_information_from_url($referrer_url) {

		$social_network_name = null;

		foreach ($this->get_definitions() as $domain => $name) {

			if (preg_match('/(^|[\.\/])'.$domain.'([\.\/]|$)/', $referrer_url)) {
				$social_network_name = $name;
				continue;
			}
		}

		// Return null if no match
		if ($social_network_name === null || $social_network_name === '') {
			return false;
		}

		return [
			'name' => $social_network_name,
		];
	}
}
