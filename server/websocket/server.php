<?php
declare(strict_types=1);

const HOST = '0.0.0.0';
const PORT = 8080;
const STORAGE_DIR = __DIR__ . '/../../storage';
const DB_PATH = STORAGE_DIR . '/classicats.sqlite';
const SCHEMA_PATH = __DIR__ . '/../../sql/schema.sql';

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
    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec(file_get_contents(SCHEMA_PATH));
    return $pdo;
}

function logLine(string $message): void
{
    $line = '[' . date('c') . '] ' . $message . PHP_EOL;
    file_put_contents(STORAGE_DIR . '/logs/websocket.log', $line, FILE_APPEND);
    echo $line;
}

function logPacket(string $connectionId, string $direction, int $opcode, string $payload): void
{
    $text = preg_match('//u', $payload) && preg_match('/^[\x09\x0A\x0D\x20-\x7E]*$/', $payload) ? $payload : null;
    $hex = bin2hex(substr($payload, 0, 1024));
    db()->prepare('INSERT INTO websocket_packets (connection_id, direction, opcode, length, payload_hex, payload_text) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$connectionId, $direction, $opcode, strlen($payload), $hex, $text]);
    logLine("$direction opcode=$opcode bytes=" . strlen($payload) . " conn=$connectionId hex=" . substr($hex, 0, 160));
}

function socketWriteAll($socket, string $data): void
{
    $offset = 0;
    $length = strlen($data);
    while ($offset < $length) {
        $written = @socket_write($socket, substr($data, $offset));
        if ($written === false || $written === 0) {
            throw new RuntimeException('socket_write failed');
        }
        $offset += $written;
    }
}

function protoVarint(int $value): string
{
    $out = '';
    do {
        $byte = $value & 0x7f;
        $value = intdiv($value, 128);
        if ($value > 0) {
            $byte |= 0x80;
        }
        $out .= chr($byte);
    } while ($value > 0);
    return $out;
}

function protoTag(int $field, int $wireType): string
{
    return protoVarint(($field << 3) | $wireType);
}

function protoBytes(int $field, string $value): string
{
    return protoTag($field, 2) . protoVarint(strlen($value)) . $value;
}

function protoMessage(int $field, string $message): string
{
    return protoBytes($field, $message);
}

function protoBool(int $field, bool $value): string
{
    return protoTag($field, 0) . chr($value ? 1 : 0);
}

function protoInt(int $field, int $value): string
{
    return protoTag($field, 0) . protoVarint($value);
}

function classicatsFrame(string $serverMessage): string
{
    return protoVarint(strlen($serverMessage)) . $serverMessage;
}

function classicatsServerMessage(int $field, string $payload): string
{
    return classicatsFrame(protoMessage($field, $payload));
}

function classicatsServerResponseMap(): array
{
    return [
        3 => 'register_result',
        4 => 'opponent',
        5 => 'ack_response',
        6 => 'my_profile',
        7 => 'leaderboard',
        8 => 'match_result',
        9 => 'config',
        10 => 'login_response',
        11 => 'leaderboard_position',
        12 => 'inventory',
        13 => 'purchase_result',
        16 => 'parcels',
        17 => 'profile_resources',
        18 => 'rating_leaderboard',
        21 => 'big_fight_data',
        22 => 'big_fight_result',
        23 => 'bet_fights',
        24 => 'bet_fight_result',
        25 => 'vehicles_and_inventory',
        26 => 'no_change',
        27 => 'coppa_status',
        29 => 'intro_fight_opponents',
        30 => 'prestige_points_leaderboard',
        31 => 'prestige_points_leaderboard_position',
        34 => 'pon',
        35 => 'gacha_box_unlock',
        36 => 'connect_facebook_response',
        37 => 'force_load_from_facebook_response',
        38 => 'profile_lite',
        39 => 'friends_list',
        40 => 'profile_lite_with_vehicle',
        41 => 'additional_part_received',
        42 => 'offer_list',
        43 => 'team',
        44 => 'find_teams_response',
        45 => 'get_team_info_response',
        46 => 'team_chat_message_list',
        48 => 'team_info_lite',
        50 => 'team_tower_match_result',
        51 => 'team_tower_info',
        52 => 'team_box_leaderboard',
        53 => 'team_box_info',
        259 => 'gpx_restore_payments_result',
        260 => 'gpx_analytics_result',
    ];
}

function classicatsRegisterResult(string $connectionId): string
{
    // RegisterResult has three required fields in the recovered client:
    // string/bytes id, string/bytes session, and a bool success flag.
    $inner = protoBytes(1, 'classicats-' . $connectionId)
        . protoBytes(2, bin2hex(random_bytes(8)))
        . protoBool(3, true);
    return classicatsServerMessage(3, $inner);
}

function classicatsAck(): string
{
    return classicatsServerMessage(5, '');
}

function classicatsResources(int $coins = 1000, int $gems = 100, int $skillpoints = 0): string
{
    return protoInt(1, $coins)
        . protoInt(2, $gems)
        . protoInt(4, $skillpoints);
}

function classicatsReward(): string
{
    return protoMessage(2, classicatsResources())
        . protoInt(6, 0);
}

function classicatsProfileLite(string $connectionId): string
{
    return protoBytes(1, 'classicats-' . $connectionId)
        . protoBytes(2, 'Classicat')
        . protoInt(3, 1)
        . protoInt(8, 0);
}

function classicatsQuickMatchStreakReward(): string
{
    return protoInt(1, 0)
        . protoInt(2, 0);
}

function classicatsPlayerProfile(string $connectionId): string
{
    return protoMessage(1, classicatsProfileLite($connectionId))
        . protoInt(4, 0)
        . protoMessage(5, '')
        . protoInt(7, 0)
        . protoMessage(10, classicatsResources())
        . protoInt(11, 0)
        . protoInt(12, 1)
        . protoInt(15, 0)
        . protoInt(16, 0)
        . protoBytes(21, 'classicats-vai')
        . protoInt(23, 0)
        . protoBytes(24, 'Classicat')
        . protoMessage(34, classicatsQuickMatchStreakReward())
        . protoInt(38, 0);
}

function classicatsProfile(string $connectionId): string
{
    return classicatsServerMessage(6, classicatsPlayerProfile($connectionId));
}

function classicatsConfig(): string
{
    $upgradeTutorialPart = protoBytes(1, 'classicats-upgrade-part')
        . protoBytes(2, 'classicats_body')
        . protoInt(3, 0)
        . protoInt(4, 0)
        . protoInt(5, 0)
        . protoInt(6, 0)
        . protoInt(7, 0);

    $config = protoInt(6, 0)
        . protoMessage(8, $upgradeTutorialPart)
        . protoInt(37, 0)
        . protoInt(38, 0)
        . protoInt(40, 0)
        . protoInt(41, 0)
        . protoInt(47, 0)
        . protoInt(48, 0)
        . protoInt(49, 0)
        . protoInt(50, 140)
        . protoInt(51, 1)
        . protoInt(52, 50)
        . protoInt(53, 5000)
        . protoInt(55, 1)
        . protoInt(56, 0)
        . protoInt(57, 0);

    return classicatsServerMessage(9, $config);
}

function classicatsLoginResponse(string $connectionId): string
{
    $inner = protoMessage(1, classicatsPlayerProfile($connectionId))
        . protoInt(2, time())
        . protoBool(3, true);
    return classicatsServerMessage(10, $inner);
}

function classicatsNoChange(): string
{
    return classicatsServerMessage(26, '');
}

function readProtoVarint(string $data, int &$offset): ?int
{
    $result = 0;
    $shift = 0;
    $length = strlen($data);
    while ($offset < $length) {
        $byte = ord($data[$offset++]);
        $result |= (($byte & 0x7f) << $shift);
        if (($byte & 0x80) === 0) {
            return $result;
        }
        $shift += 7;
        if ($shift > 63) {
            return null;
        }
    }
    return null;
}

function skipProtoValue(string $data, int &$offset, int $wireType): bool
{
    $length = strlen($data);
    if ($wireType === 0) {
        return readProtoVarint($data, $offset) !== null;
    }
    if ($wireType === 1) {
        $offset += 8;
        return $offset <= $length;
    }
    if ($wireType === 2) {
        $size = readProtoVarint($data, $offset);
        if ($size === null) {
            return false;
        }
        $offset += $size;
        return $offset <= $length;
    }
    if ($wireType === 5) {
        $offset += 4;
        return $offset <= $length;
    }
    return false;
}

function takeClassicatsMessages(string &$stream): array
{
    $messages = [];
    $offset = 0;
    $length = strlen($stream);

    while ($offset < $length) {
        $start = $offset;
        $messageLength = readProtoVarint($stream, $offset);
        if ($messageLength === null || ($length - $offset) < $messageLength) {
            $offset = $start;
            break;
        }
        $messages[] = substr($stream, $offset, $messageLength);
        $offset += $messageLength;
    }

    if ($offset > 0) {
        $stream = substr($stream, $offset);
    }
    return $messages;
}

function classicatsClientEventMap(): array
{
    return [
        4 => 'register',
        5 => 'find_league_match',
        6 => 'find_bot_match',
        7 => 'get_my_profile',
        8 => 'start_match',
        9 => 'save_match_result',
        10 => 'get_leaderboard',
        12 => 'update_push_token',
        13 => 'login',
        14 => 'get_config',
        15 => 'install_vehicle_part',
        16 => 'replace_chassis',
        17 => 'uninstall_vehicle_part',
        18 => 'fuse',
        19 => 'get_my_leaderboard_position',
        20 => 'inapp_purchase',
        21 => 'switch_vehicle',
        22 => 'sell_item',
        23 => 'claim_parcels',
        24 => 'purchase_coins',
        28 => 'get_parcels',
        31 => 'get_championship_opponent',
        32 => 'complete_tutorial_step',
        33 => 'heartbeat',
        34 => 'clear_inventory_badges',
        35 => 'get_rating_leaderboard',
        36 => 'get_test_match_opponent',
        37 => 'set_name',
        40 => 'start_big_fight',
        41 => 'save_big_fight_result',
        42 => 'cancel_fight',
        44 => 'get_bet_fights',
        45 => 'place_bet',
        46 => 'save_bet_fight_result',
        48 => 'get_vehicles_and_inventory',
        49 => 'update_client_preferences',
        77 => 'get_coppa_status',
        79 => 'get_intro_fight_opponents',
        80 => 'attach_sticker',
        81 => 'move_sticker',
        82 => 'detach_sticker',
        83 => 'prestige',
        84 => 'pick_sticker',
        86 => 'get_prestige_points_leaderboard',
        87 => 'get_prestige_points_rank',
        88 => 'spend_skill_points',
        91 => 'gacha',
        92 => 'start_gacha_box_unlock',
        93 => 'speedup_gacha_box_unlock',
        94 => 'store_purchase',
        95 => 'connect_facebook',
        96 => 'change_facebook_association',
        97 => 'force_load_from_facebook',
        98 => 'get_profile_lite',
        99 => 'get_friends',
        100 => 'gacha_box_speedup_ad_watched',
        101 => 'get_profile_lite_with_vehicle',
        102 => 'claim_additional_reward',
        103 => 'get_offers',
        104 => 'buy_skin_item',
        105 => 'select_skin_item',
        106 => 'get_team',
        107 => 'create_team',
        108 => 'join_team',
        109 => 'kick_player_from_team',
        110 => 'leave_team',
        111 => 'claim_linked_social_channel_reward',
        112 => 'find_teams',
        113 => 'get_team_info',
        114 => 'update_team_config',
        115 => 'get_team_chat_messages',
        116 => 'post_team_chat_message',
        119 => 'save_team_tower_match_result',
        120 => 'get_team_tower_info',
        121 => 'reset_team_tower',
        122 => 'get_team_box_leaderboard',
        123 => 'get_team_box_info',
        124 => 'start_team_tower_fight',
        256 => 'gpx_update_notifications',
        257 => 'gpx_consume_payment',
        258 => 'gpx_restore_payments',
        259 => 'gpx_reset_profile',
        260 => 'gpx_analytics',
        998 => 'refill_inventory',
        999 => 'get_debug_bot',
    ];
}

function classifyClientMessage(string $message): string
{
    $offset = 0;
    $length = strlen($message);
    $fields = [];

    while ($offset < $length) {
        $tag = readProtoVarint($message, $offset);
        if ($tag === null) {
            break;
        }
        $field = $tag >> 3;
        $wireType = $tag & 7;
        $fields[] = $field;
        if (!skipProtoValue($message, $offset, $wireType)) {
            break;
        }
    }

    $eventMap = classicatsClientEventMap();
    foreach ($fields as $field) {
        if (isset($eventMap[$field])) {
            return $eventMap[$field];
        }
    }

    return 'fields:' . implode(',', $fields);
}

function responseForClientMessage(string $type, string $connectionId): string
{
    return match ($type) {
        'register' => classicatsRegisterResult($connectionId),
        'login' => classicatsLoginResponse($connectionId),
        'get_config' => classicatsConfig(),
        'get_my_profile' => classicatsProfile($connectionId),
        'get_my_leaderboard_position',
        'get_leaderboard',
        'get_rating_leaderboard',
        'get_prestige_points_leaderboard',
        'get_prestige_points_rank' => classicatsNoChange(),
        default => classicatsAck(),
    };
}

function responseNameForClientMessage(string $type): string
{
    return match ($type) {
        'register' => 'register_result',
        'login' => 'login_response',
        'get_config' => 'config',
        'get_my_profile' => 'my_profile',
        'get_my_leaderboard_position',
        'get_leaderboard',
        'get_rating_leaderboard',
        'get_prestige_points_leaderboard',
        'get_prestige_points_rank' => 'no_change',
        default => 'ack_response',
    };
}

function handshake($client, string $headers): bool
{
    if (!preg_match('/Sec-WebSocket-Key:\s*(.+)\r\n/i', $headers, $m)) {
        return false;
    }

    $key = trim($m[1]);
    $accept = base64_encode(sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));
    $protocol = '';
    if (preg_match('/Sec-WebSocket-Protocol:\s*(.+)\r\n/i', $headers, $pm)) {
        $requested = array_map('trim', explode(',', trim($pm[1])));
        if (in_array('binary', $requested, true)) {
            $protocol = "Sec-WebSocket-Protocol: binary\r\n";
        }
    }

    $response = "HTTP/1.1 101 Switching Protocols\r\n"
        . "Upgrade: websocket\r\n"
        . "Connection: Upgrade\r\n"
        . "Sec-WebSocket-Accept: $accept\r\n"
        . $protocol
        . "\r\n";
    socketWriteAll($client, $response);
    return true;
}

function readFrame($client): ?array
{
    $header = @socket_read($client, 2, PHP_BINARY_READ);
    if ($header === false || strlen($header) < 2) {
        return null;
    }

    $b1 = ord($header[0]);
    $b2 = ord($header[1]);
    $opcode = $b1 & 0x0f;
    $masked = ($b2 & 0x80) !== 0;
    $length = $b2 & 0x7f;

    if ($length === 126) {
        $ext = socket_read($client, 2, PHP_BINARY_READ);
        $length = unpack('n', $ext)[1];
    } elseif ($length === 127) {
        $ext = socket_read($client, 8, PHP_BINARY_READ);
        $parts = unpack('N2', $ext);
        $length = ($parts[1] << 32) + $parts[2];
    }

    $mask = $masked ? socket_read($client, 4, PHP_BINARY_READ) : '';
    $payload = '';
    while (strlen($payload) < $length) {
        $chunk = socket_read($client, $length - strlen($payload), PHP_BINARY_READ);
        if ($chunk === false || $chunk === '') {
            break;
        }
        $payload .= $chunk;
    }

    if ($masked) {
        $decoded = '';
        for ($i = 0, $n = strlen($payload); $i < $n; $i++) {
            $decoded .= $payload[$i] ^ $mask[$i % 4];
        }
        $payload = $decoded;
    }

    return ['opcode' => $opcode, 'payload' => $payload];
}

function sendFrame($client, string $payload, int $opcode = 1): void
{
    $length = strlen($payload);
    $head = chr(0x80 | $opcode);
    if ($length < 126) {
        $head .= chr($length);
    } elseif ($length < 65536) {
        $head .= chr(126) . pack('n', $length);
    } else {
        $head .= chr(127) . pack('N2', 0, $length);
    }
    socketWriteAll($client, $head . $payload);
}

ensureStorage();
$server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($server, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($server, HOST, PORT);
socket_listen($server);
logLine('Project Classicats WebSocket listening on ' . HOST . ':' . PORT);

while (true) {
    $client = socket_accept($server);
    if ($client === false) {
        continue;
    }

    $connectionId = bin2hex(random_bytes(6));
    $headers = socket_read($client, 8192, PHP_BINARY_READ) ?: '';
    if (!handshake($client, $headers)) {
        logLine("bad handshake conn=$connectionId");
        socket_close($client);
        continue;
    }

    logLine("connected conn=$connectionId");
    $binaryStream = '';
    while (true) {
        $frame = readFrame($client);
        if ($frame === null) {
            break;
        }

        $opcode = $frame['opcode'];
        $payload = $frame['payload'];
        if ($opcode === 8) {
            logPacket($connectionId, 'in', $opcode, $payload);
            break;
        }
        if ($opcode === 9) {
            sendFrame($client, $payload, 10);
            continue;
        }

        logPacket($connectionId, 'in', $opcode, $payload);
        if ($opcode === 1) {
            $decoded = json_decode($payload, true);
            $reply = [
                'ok' => true,
                'type' => $decoded['type'] ?? 'ack',
                'server_time' => time(),
                'note' => 'Project Classicats WebSocket text compatibility response',
            ];
            $out = json_encode($reply, JSON_UNESCAPED_SLASHES);
            logPacket($connectionId, 'out', 1, $out);
            sendFrame($client, $out, 1);
        } elseif ($opcode === 2) {
            $binaryStream .= $payload;
            foreach (takeClassicatsMessages($binaryStream) as $clientMessage) {
                $type = classifyClientMessage($clientMessage);
                $responseName = responseNameForClientMessage($type);
                logLine("client-message type=$type response=$responseName bytes=" . strlen($clientMessage) . " conn=$connectionId");
                $out = responseForClientMessage($type, $connectionId);
                logPacket($connectionId, 'out', 2, $out);
                sendFrame($client, $out, 2);
            }
        }
    }

    socket_close($client);
    logLine("closed conn=$connectionId");
}
