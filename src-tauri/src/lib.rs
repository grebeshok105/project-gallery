mod achievements;
mod agent;
mod commands;
mod db;
mod github;
mod llm;
mod models;
mod mcp;
mod secrets;

use db::Db;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .expect("не удалось определить каталог данных приложения");
            let conn = db::open(dir).expect("не удалось открыть базу данных");
            app.manage(Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::get_project,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::toggle_favorite,
            commands::list_tags,
            commands::get_stats,
            commands::list_achievements,
            commands::check_new_achievements,
            commands::create_custom_achievement,
            commands::toggle_custom_achievement,
            commands::delete_custom_achievement,
            commands::bulk_delete_achievements,
            commands::get_setting,
            commands::set_setting,
            commands::get_config,
            commands::set_secret,
            commands::import_github,
            commands::refresh_repo_activity,
            commands::llm_chat,
            commands::llm_project_ideas,
            commands::llm_agent_chat,
            commands::llm_autodescribe_missing,
            commands::list_chats,
            commands::create_chat,
            commands::rename_chat,
            commands::delete_chat,
            commands::list_chat_messages,
            commands::find_similar,
            commands::list_blacklist,
            commands::add_to_blacklist,
            commands::remove_from_blacklist,
            commands::list_mcp_servers,
            commands::add_mcp_server,
            commands::remove_mcp_server,
            commands::toggle_mcp_server,
            commands::mcp_list_tools,
            commands::find_similar,
        ])
        .run(tauri::generate_context!())
        .expect("ошибка запуска приложения Tauri");
}
