<?php

namespace Caliban\Client;

use Caliban\Abstracts\Singleton;

class Client extends Singleton {

	/**
	 * @var array Options to push onto tracker at load
	 */
	private $data;

	public function __construct() {
		$this->data = [];
	}

	/**
	 * Add items to an associative array property without mutating exisitng keys
	 *
	 * @param string $key
	 * @param array $data
	 */
	public function set(string $key, $event_params = null): Client {

		// Queue event + data until tracker is loader
		$this->data[$key] = $event_params;

		return $this;
	}

	public function load_tracker(): void
    {
        $file = '/js/client.js';

        // Open tracker script tag
        print "<script type=\"text/javascript\">\n";

        print "var _cbn = window._cbn || [];\n";

        foreach ($this->data as $event_name => $event_params) {

            // Open option line
            $option_to_add = "_cbn.push(['{$event_name}'";

            // Conditionally add event arguments if set
            if (!is_null($event_params)) {
                $option_to_add .= ",";

                if (is_numeric($event_params)) {
                    $option_to_add .= $event_params;
                } else if (is_string($event_params)) {
                    $option_to_add .= "'" . $event_params . "'";
                } else {
                    $option_to_add .= json_encode($event_params, true);
                }
            }

            // Close option line
            $option_to_add .= "]);\n";

            // Output option
            print $option_to_add;
        }

        readfile(dirname(__FILE__) . $file);

        // Close tracker script tag
        print "\n</script>\n";
    }
    /**
     * Similar to load_tracker but just returns the plain js without tags for more flexibility.
     */
    public function get_tracker_js(): string {
        $file = '/js/client.js';

        $tracker_js = "var _cbn = window._cbn || [];\n";

        foreach ($this->data as $event_name => $event_params) {

            // Open option line
            $option_to_add = "_cbn.push(['{$event_name}'";

            // Conditionally add event arguments if set
            if (!is_null($event_params)) {
                $option_to_add .= ",";

                if (is_numeric($event_params)) {
                    $option_to_add .= $event_params;
                } else if (is_string($event_params)) {
                    $option_to_add .= "'" . $event_params . "'";
                } else {
                    $option_to_add .= json_encode($event_params, true);
                }
            }

            // Close option line
            $option_to_add .= "]);\n";

            // Output option
            $tracker_js .= $option_to_add;
        }

        $tracker_js .= file_get_contents(dirname(__FILE__) . $file);

        return $tracker_js;
    }
}

