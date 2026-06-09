<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (strpos($path, '/api') === 0) {
    require __DIR__ . '/server/php/index.php';
    return true;
}

$file = realpath(__DIR__ . $path);
if ($file !== false && strpos($file, __DIR__) === 0 && (is_file($file) || is_dir($file))) {
    return false;
}

if ($path === '/' || $path === '/game') {
    header('Location: /game/', true, 302);
    return true;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo "Project Classicats: file not found\n";
return true;
