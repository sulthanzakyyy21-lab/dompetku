<?php
$data_baru = [
    'keterangan' => 'beli rujak',
    'jumlah'     => 20000, 
    'tanggal'    => '21 november 2025'
];
echo "<b>1. Ini adalah Array PHP asli:</b><br>";
print_r($data_baru);
$data_json = json_encode($data_baru);
echo "<br>";
echo $data_json;
file_put_contents('data_uji.json', $data_json);
$hasil_baca_file = file_get_contents('data_uji.json');
echo $hasil_baca_file;

