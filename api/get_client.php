<?php

header("Content-Type: application/json; charset=UTF-8");

$pdo = new PDO(
    "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
    "root",
    ""
);

$phone = $_GET['phone'] ?? '';

$stmt = $pdo->prepare("SELECT name FROM clients WHERE phone = ?");
$stmt->execute([$phone]);

$client = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode($client ?: ["name" => ""]);

?>