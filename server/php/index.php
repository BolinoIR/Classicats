<?php
declare(strict_types=1);

const STORAGE_DIR = __DIR__ . '/../../storage';
const DB_PATH = STORAGE_DIR . '/classicats.sqlite';
const SCHEMA_PATH = __DIR__ . '/../../sql/schema.sql';
const SEED_PATH = __DIR__ . '/../../sql/seed.sql';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function ensureStorage(): void
{
    if (!is_dir(STORAGE_DIR)) {
        mkdir(STORAGE_DIR, 0775, true);
    }
    if (!is_dir(STORAGE_DIR . '/logs')) {
        mkdir(STORAGE_DIR . '/logs', 0775, true);
    }
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    ensureStorage();
    $isNew = !file_exists(DB_PATH);
    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec(file_get_contents(SCHEMA_PATH));
    if ($isNew && file_exists(SEED_PATH)) {
        $pdo->exec(file_get_contents(SEED_PATH));
    }
    return $pdo;
}

function jsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        return $decoded;
    }
    parse_str($raw, $form);
    return $form ?: ['raw' => $raw];
}

function respond($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function logEvent(?string $playerId, string $type, string $route, array $payload = []): void
{
    $stmt = db()->prepare('INSERT INTO events (player_id, type, route, payload_json) VALUES (?, ?, ?, ?)');
    $stmt->execute([$playerId, $type, $route, json_encode($payload, JSON_UNESCAPED_SLASHES)]);
}

function prices(): array
{
    $currencies = [
        'USD' => '1.99', 'GBP' => '1.99', 'EUR' => '1.99', 'NZD' => '2.59',
        'CAD' => '2.29', 'MXN' => '26', 'AUD' => '2.49', 'JPY' => '240',
        'CNY' => '12', 'SGD' => '2.58', 'HKD' => '15', 'TWD' => '60',
        'IDR' => '23000', 'INR' => '120', 'RUB' => '119', 'TRY' => '4.29',
        'ILS' => '6.9', 'ZAR' => '24.99', 'SAR' => '7.29', 'AED' => '7.29',
        'DKK' => '16', 'SEK' => '19', 'CHF' => '2', 'NOK' => '19',
    ];

    return [
        'com.zeptolab.cats.gems1' => $currencies,
        'com.zeptolab.cats.gems2' => array_map(fn($v) => is_numeric($v) ? (string)round(((float)$v) * 2.5, 2) : $v, $currencies),
        'com.zeptolab.cats.gems3' => array_map(fn($v) => is_numeric($v) ? (string)round(((float)$v) * 5.5, 2) : $v, $currencies),
        'com.zeptolab.cats.gems4' => array_map(fn($v) => is_numeric($v) ? (string)round(((float)$v) * 10.5, 2) : $v, $currencies),
        'com.zeptolab.cats.gems5' => array_map(fn($v) => is_numeric($v) ? (string)round(((float)$v) * 25, 2) : $v, $currencies),
        'com.zeptolab.cats.gems6' => array_map(fn($v) => is_numeric($v) ? (string)round(((float)$v) * 52.5, 2) : $v, $currencies),
        'CONVERSION_1_C' => $currencies,
        'com.zeptolab.cats.offer2' => $currencies,
    ];
}

function defaultInventory(): array
{
    return [
        ['id' => 'body-classic-1', 'type' => 'body', 'level' => 1, 'rarity' => 'common'],
        ['id' => 'wheel-classic-1', 'type' => 'wheel', 'level' => 1, 'rarity' => 'common'],
        ['id' => 'weapon-classic-1', 'type' => 'weapon', 'level' => 1, 'rarity' => 'common'],
    ];
}

function upsertPlayer(array $input): array
{
    $id = (string)($input['id'] ?? $input['player_id'] ?? $input['uid'] ?? ('classicats-' . bin2hex(random_bytes(8))));
    $name = trim((string)($input['name'] ?? $input['nickname'] ?? 'Classicat')) ?: 'Classicat';
    $email = isset($input['email']) ? (string)$input['email'] : null;
    $token = (string)($input['token'] ?? bin2hex(random_bytes(16)));
    $inventory = json_encode(defaultInventory(), JSON_UNESCAPED_SLASHES);
    $profile = json_encode([
        'id' => $id,
        'name' => $name,
        'level' => 1,
        'league' => 1,
        'soft_currency' => 10000,
        'hard_currency' => 500,
        'gang_id' => 'classicats-default',
    ], JSON_UNESCAPED_SLASHES);

    $stmt = db()->prepare(
        'INSERT INTO players (id, name, email, token, is_guest, inventory_json, profile_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = COALESCE(excluded.email, players.email), token = excluded.token, updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([$id, $name, $email, $token, !empty($input['guest']) ? 1 : 0, $inventory, $profile]);

    return getPlayer($id);
}

function getPlayer(string $id): array
{
    $stmt = db()->prepare('SELECT * FROM players WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return upsertPlayer(['id' => $id]);
    }
    return playerResponse($row);
}

function playerResponse(array $row): array
{
    return [
        'ok' => true,
        'player' => [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'is_guest' => (bool)$row['is_guest'],
            'soft_currency' => (int)$row['soft_currency'],
            'hard_currency' => (int)$row['hard_currency'],
            'profile' => json_decode($row['profile_json'], true) ?: [],
            'inventory' => json_decode($row['inventory_json'], true) ?: [],
            'save' => json_decode($row['save_json'], true) ?: [],
        ],
        'token' => $row['token'],
        'server_time' => time(),
        'server_version' => 'project-classicats-0.1',
    ];
}

function savePlayer(string $id, array $payload): array
{
    $player = getPlayer($id);
    $save = $payload['save'] ?? $payload;
    $profile = $payload['profile'] ?? $player['player']['profile'];
    $inventory = $payload['inventory'] ?? $player['player']['inventory'];
    $stmt = db()->prepare('UPDATE players SET save_json = ?, profile_json = ?, inventory_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $stmt->execute([
        json_encode($save, JSON_UNESCAPED_SLASHES),
        json_encode($profile, JSON_UNESCAPED_SLASHES),
        json_encode($inventory, JSON_UNESCAPED_SLASHES),
        $id,
    ]);
    logEvent($id, 'save', $_SERVER['REQUEST_URI'], $payload);
    return getPlayer($id);
}

function routePath(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
    $path = preg_replace('#^/api#', '', $path);
    return '/' . trim($path, '/');
}

$method = $_SERVER['REQUEST_METHOD'];
$path = routePath();
$body = jsonBody();

try {
    if ($path === '/prices' && $method === 'GET') {
        respond(prices());
    }

    if (preg_match('#^/purchase/([^/]+)/([^/]+)/([^/]+)$#', $path, $m)) {
        [$all, $playerId, $currency, $productId] = $m;
        $price = (float)(prices()[$productId][$currency] ?? prices()[$productId]['USD'] ?? 0);
        db()->prepare('INSERT INTO purchases (player_id, product_id, currency, price, payload_json) VALUES (?, ?, ?, ?, ?)')
            ->execute([$playerId, $productId, $currency, $price, json_encode($body, JSON_UNESCAPED_SLASHES)]);
        logEvent($playerId, 'purchase', $path, ['product_id' => $productId, 'currency' => $currency, 'price' => $price]);
        respond(['ok' => true, 'simulated' => true, 'product_id' => $productId, 'currency' => $currency, 'price' => $price]);
    }

    if (preg_match('#^/(players|player)/(login|create|register)$#', $path) || in_array($path, ['/login', '/register', '/player'], true)) {
        $player = upsertPlayer($body + $_GET);
        logEvent($player['player']['id'], 'login', $path, $body);
        respond($player);
    }

    if (preg_match('#^/(players|player)/([^/]+)$#', $path, $m) && $method === 'GET') {
        respond(getPlayer($m[2]));
    }

    if (preg_match('#^/(players|player)/([^/]+)/(save|profile|inventory|currency)$#', $path, $m)) {
        respond(savePlayer($m[2], $body));
    }

    if ($path === '/save') {
        $id = (string)($body['id'] ?? $body['player_id'] ?? $_GET['id'] ?? 'local-player');
        respond($method === 'GET' ? getPlayer($id) : savePlayer($id, $body));
    }

    if (preg_match('#^/(matchmaking|matches|battle|battles)#', $path)) {
        $playerId = (string)($body['player_id'] ?? $body['id'] ?? $_GET['player_id'] ?? 'unknown');
        $matchId = (string)($body['match_id'] ?? 'match-' . bin2hex(random_bytes(8)));
        $opponent = ['id' => 'bot-classicats', 'name' => 'Classicats Bot', 'rating' => 100];
        db()->prepare('INSERT OR IGNORE INTO matches (id, player_id, opponent_json, state_json) VALUES (?, ?, ?, ?)')
            ->execute([$matchId, $playerId, json_encode($opponent), json_encode(['status' => 'ready'])]);
        logEvent($playerId, 'matchmaking', $path, $body);
        respond(['ok' => true, 'match_id' => $matchId, 'opponent' => $opponent, 'state' => ['status' => 'ready']]);
    }

    if (preg_match('#^/(gangs|gang|team)#', $path)) {
        $playerId = (string)($body['player_id'] ?? $body['id'] ?? $_GET['player_id'] ?? 'unknown');
        logEvent($playerId, 'gang', $path, $body);
        respond(['ok' => true, 'gang' => ['id' => 'classicats-default', 'name' => 'Classicats', 'members' => []]]);
    }

    if ($path === '/events') {
        logEvent((string)($body['player_id'] ?? ''), (string)($body['event'] ?? 'event'), $path, $body);
        respond(['ok' => true]);
    }

    logEvent((string)($body['player_id'] ?? $body['id'] ?? ''), 'unknown_http', $path, ['method' => $method, 'body' => $body, 'query' => $_GET]);
    respond(['ok' => true, 'route' => $path, 'method' => $method, 'note' => 'Unknown route logged by Project Classicats compatibility API']);
} catch (Throwable $e) {
    error_log($e);
    respond(['ok' => false, 'error' => $e->getMessage()], 500);
}
