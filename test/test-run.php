<?php

require_once __DIR__ . "/../vendor/autoload.php";

try {

    $sesh = \Caliban\Caliban::get_instance()
        // ->set_url(str_replace('&amp;', '&', urldecode($_GET['src_uri'])))
                                  ->set_whitelisted_params(['src'])
                                  ->set_cache_expiration_seconds(30)
                                  ->init()
                                  ->save()
                                  ->toJSON();

    print $sesh;

} catch (Exception $e) {
    print CBN_DEBUG ? sprintf("ERROR: %s (Line %s) in %s", $e->getMessage, $e->getLine(), $e->getFile()) : "false";
}
