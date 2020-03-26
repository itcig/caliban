<?php

namespace Caliban\Server;

use Caliban\Abstracts\Singleton;

class Server extends Singleton {

	private $request_path;

	private $parsed_query;

	private $data;

	public function __construct() {
		$this->data = [];
	}

	public function run() {

		if ($parsed = json_decode(\Cig\is_json(file_get_contents("php://input")) ?? null, true)) {
			$this->data = $parsed;
		} else {
			$this->data = $_POST;
		}

		$this->parsed_query = \Cig\parse_querystring();

		$this->request_path = \Cig\url_path();

		$this->router();

		return $this;
	}

	private function router() {

		$is_caliban_route = false;

		$route = trim($this->request_path, "/");

		switch ($route) {
			case 'caliban.js':
				$is_caliban_route = true;
				$this->send_main_js();

				break;

			case 'collect':
				$is_caliban_route = true;
				$this->collect_data();

				break;

			default:
				// do nothing
		}

		// If route is handled then exit to prevent further execution in case this server is running inside another application
		if ($is_caliban_route) {
			exit;
		}
	}

	private function send_main_js(): void {
		$file = '/js/caliban.js';

		header("Content-Type: application/javascript");
		//		header("Cache-Control: max-age=604800, public");

		readfile(dirname(__FILE__) . $file);
	}

	private function collect_data(): void {

		// Track session with passed in request data
		$collector = Collect::get_instance()
		       ->set_data($this->parsed_query)
		       ->init();

		// If `send_image` then respond with 1x1 tracking pixel
		if (!empty($this->parsed_query['send_image'])) {

			$file = dirname(__FILE__) . '/assets/img.gif';

			// Send back pixel response
			if (file_exists($file)) {
				// Never cache
				header('Cache-Control: no-cache, no-store, max-age=0, must-revalidate');
				header('Expires: ' . date("D M j G:i:s T Y", strtotime("-1 hour"))); // Date in the past

				header('Content-Type: image/gif');
				readfile($file);

			} else {
				$this->resource_not_found();
			}

		} else if (!empty($this->parsed_query['send_js'])) {

			header("Content-Type: application/javascript");

			$caliban_data = $collector->get_tracker()->toArray();

			// Send session data to JS tracker and add data to forms
			print "window._cbn.push(['setSessionData', " . \Cig\to_javascript_object($caliban_data) . "]);\n";
			print "window._cbn.push(['addFormData']);\n";

		// Otherwise send back a text response
		} else {

			header('Content-Type: application/text');

			print "OK";
		}
	}

	private function resource_not_found(): void {
		http_response_code(404);
	}
}

