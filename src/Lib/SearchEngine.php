<?php

namespace Caliban\Lib;

use \Caliban\Abstracts\Singleton;

class SearchEngine extends Singleton {

	/** @var string location of definition file (built from matomo/searchengine-and-social-list) */
	const DEFINITION_FILE = __DIR__ . '/../Data/SearchEngines.yml';

	protected $definition_list = null;

	/**
	 * Returns list of search engines by URL
	 *
	 * @return array  Array of ( URL => array( searchEngineName, keywordParameter, path ) )
	 */
	private function get_definitions() {
		// Load definitions if not set
		if (empty($this->definition_list)) {
			$search_engines = \Spyc::YAMLLoad(self::DEFINITION_FILE);

			$url_to_info = [];

			foreach ($search_engines as $name => $info) {
				if (empty($info) || !is_array($info)) {
					continue;
				}

				foreach ($info as $url_definitions) {
					foreach ($url_definitions['urls'] as $url) {
						$search_engine_data = $url_definitions;
						unset($search_engine_data['urls']);
						$search_engine_data['name'] = $name;
						$url_to_info[$url] = $search_engine_data;
					}
				}
			}

			$this->definition_list = $url_to_info;
		}

		return $this->definition_list;
	}

	/**
	 * Extracts a keyword from a raw not encoded URL.
	 * Will only extract keyword if a known search engine has been detected.
	 * Returns the keyword:
	 * - strtolowered: "QUErY test!" will return "query test!"
	 * - trimmed: extra spaces before and after are removed
	 *
	 * The function returns false when a keyword couldn't be found.
	 *     eg. if the url is "http://www.google.com/partners.html" this will return false,
	 *       as the google keyword parameter couldn't be found.
	 *
	 * @see unit tests in /tests/core/Common.test.php
	 *
	 * @param string $referrer_url URL referrer URL, eg. $_SERVER['HTTP_REFERER']
	 *
	 * @return array|bool   false if a keyword couldn't be extracted,
	 *                        or array(
	 *                            'name' => 'Google',
	 *                            'keywords' => 'my searched keywords')
	 */
	public function extract_information_from_url($referrer_url) {
		$referrer_parsed = @parse_url($referrer_url);
		$referrer_host = '';
		if (isset($referrer_parsed['host'])) {
			$referrer_host = $referrer_parsed['host'];
		}
		if (empty($referrer_host)) {
			return false;
		}
		// some search engines (eg. Bing Images) use the same domain
		// as an existing search engine (eg. Bing), we must also use the url path
		$referrer_path = '';
		if (isset($referrer_parsed['path'])) {
			$referrer_path = $referrer_parsed['path'];
		}

		$query = '';
		if (isset($referrer_parsed['query'])) {
			$query = $referrer_parsed['query'];
		}

		$referrer_host = $this->get_engine_host_from_url($referrer_host, $referrer_path, $query);

		if (empty($referrer_host)) {
			return false;
		}

		$definitions = $this->get_definition_by_host($referrer_host);

		$search_engine_name = $definitions['name'];
		$variable_names = $definitions['params'];
		$keywords_hidden_for = !empty($definitions['hiddenkeyword']) ? $definitions['hiddenkeyword'] : [];

		$query_params = \Cig\parse_querystring($referrer_url);

		$key = null;

		if ($search_engine_name === 'Google' && !empty($query_params['tbm'])) {
			// top bar menu
			switch ($query_params['tbm']) {
				case 'isch':
					$search_engine_name = 'Google Images';
					break;
				case 'vid':
					$search_engine_name = 'Google Video';
					break;
				case 'shop':
					$search_engine_name = 'Google Shopping';
					break;
			}
		}

		foreach ($variable_names as $variable_name) {
			if ($variable_name[0] == '/') {
				// regular expression match
				if (preg_match($variable_name, $referrer_url, $matches)) {
					$key = trim(urldecode($matches[1]));
					break;
				}
			} else {
				// search for keywords now &vname=keyword
				$key = $query_params[$variable_name] ?? null;
				$key = trim(urldecode($key));

				// Special cases: empty keywords
				if (empty($key)
				    && (
					    // empty keyword parameter
					    strpos($query, sprintf('&%s=', $variable_name)) !== false
					    || strpos($query, sprintf('?%s=', $variable_name)) !== false
				    )
				) {
					$key = false;
				}
				if (!empty($key)
				    || $key === false
				) {
					break;
				}
			}
		}

		// if no keyword found, but empty keywords are allowed
		if (!empty($keywords_hidden_for) && ($key === null || $key === '')) {

			$path_with_query_and_fragment = $referrer_path;
			if (!empty($query)) {
				$path_with_query_and_fragment .= '?' . $query;
			}
			if (!empty($referrer_parsed['fragment'])) {
				$path_with_query_and_fragment .= '#' . $referrer_parsed['fragment'];
			}

			foreach ($keywords_hidden_for as $path) {
				if (strlen($path) > 1 && substr($path, 0, 1) == '/' && substr($path, -1, 1) == '/') {
					if (preg_match($path, $path_with_query_and_fragment)) {
						$key = false;
						break;
					}
				} elseif ($path == $path_with_query_and_fragment) {
					$key = false;
					break;
				}
			}
		}

		// $key === false is the special case "No keyword provided" which is a Search engine match
		if ($key === null || $key === '') {
			return false;
		}

		if (!empty($key)) {
			$key = strtolower($key);
		}

		return [
			'name' => $search_engine_name,
			'keywords' => $key,
		];
	}

	protected function get_engine_host_from_url($host, $path, $query) {
		$search_engines = $this->get_definitions();

		$host_pattern = $this->get_lossy_url($host);
		/*
		 * Try to get the best matching 'host' in definitions
		 * 1. check if host + path matches an definition
		 * 2. check if host only matches
		 * 3. check if host pattern + path matches
		 * 4. check if host pattern matches
		 * 5. special handling
		 */
		if (array_key_exists($host . $path, $search_engines)) {
			$host = $host . $path;
		} elseif (array_key_exists($host, $search_engines)) {
			// no need to change host
		} elseif (array_key_exists($host_pattern . $path, $search_engines)) {
			$host = $host_pattern . $path;
		} elseif (array_key_exists($host_pattern, $search_engines)) {
			$host = $host_pattern;
		} elseif (!array_key_exists($host, $search_engines)) {
			if (strpos($host, '.images.search.yahoo.com') != false) {
				// Yahoo! Images
				$host = 'images.search.yahoo.com';
			} elseif (strpos($host, '.search.yahoo.com') != false) {
				// Yahoo!
				$host = 'search.yahoo.com';
			} else {
				return false;
			}
		}

		return $host;
	}

	/**
	 * Returns definitions for the given search engine host
	 *
	 * @param string $host
	 *
	 * @return array
	 */
	public function get_definition_by_host($host) {
		$search_engines = $this->get_definitions();

		if (!array_key_exists($host, $search_engines)) {
			return [];
		}

		return $search_engines[$host];
	}

	/**
	 * Reduce URL to more minimal form.  2 letter country codes are
	 * replaced by '{}', while other parts are simply removed.
	 *
	 * Examples:
	 *   www.example.com -> example.com
	 *   search.example.com -> example.com
	 *   m.example.com -> example.com
	 *   de.example.com -> {}.example.com
	 *   example.de -> example.{}
	 *   example.co.uk -> example.{}
	 *
	 * @param string $url
	 *
	 * @return string
	 */
	protected function get_lossy_url($url) {
		return preg_replace(
			[
				'/^(w+[0-9]*|search)\./',
				'/(^|\.)m\./',
				'/(\.(com|org|net|co|it|edu))?\.(\w{2})(\/|$)/',
				'/(^|\.)(\w{2})\./',
			],
			[
				'',
				'$1',
				'.{}$4',
				'$1{}.',
			],
			$url);
	}
}
