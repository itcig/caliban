<?php

namespace Caliban\Components\Containers;

use Caliban\Components\Output\OutputInterface;

interface ContainerInterface {

	public function __isset(string $name);

	public function __unset(string $name);

	public function __get(string $name);

	public function __set(string $name, $val = null) : void;

	public function output(OutputInterface $outputType = null);
}