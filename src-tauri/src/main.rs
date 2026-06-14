// Запрещаем доп. консольное окно в release-сборке под Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    project_gallery_lib::run()
}
