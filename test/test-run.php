<?php

require_once(__DIR__ . "/../vendor/autoload.php");

require_once(__DIR__ . "/../src/config.php");

try {

    $sesh = \Caliban\Caliban::get_instance()
        // ->set_url(str_replace('&amp;', '&', urldecode($_GET['src_uri'])))
                                  ->set_append_params(['campaigncode'])
                                  ->set_cache_expiration_seconds(30)
	                                ->set_referrer('https://www.google.com/')
                                  ->init()
//                                  ->save()
                                  ->toJSON();

    print $sesh;

} catch (Exception $e) {
    print CBN_DEBUG ? sprintf("ERROR: %s (Line %s) in %s", $e->getMessage, $e->getLine(), $e->getFile()) : "false";
}
