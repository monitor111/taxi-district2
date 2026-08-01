<?php
header("Content-Type: application/json; charset=UTF-8");

$pdo = new PDO(
    "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
    "root",
    ""
);

$phone = $_GET['phone'] ?? '';

if (!$phone) {
    echo json_encode(["status" => "not_found"]);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM drivers WHERE phone = ?");
$stmt->execute([$phone]);
$driver = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$driver) {
    echo json_encode(["status" => "not_found"]);
} elseif (empty($driver['name'])) {
    echo json_encode(["status" => "need_name_phone", "driver" => $driver]);
} elseif (empty($driver['car_make']) || empty($driver['car_number'])) {
    echo json_encode(["status" => "need_car", "driver" => $driver]);
} else {
    echo json_encode(["status" => "full", "driver" => $driver]);
}
?>