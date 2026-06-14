//! Безопасное хранение секретов в Windows Credential Manager через `keyring`.
//! Сюда кладём GitHub-токен и API-ключ LLM, чтобы они не лежали в открытой БД.

use anyhow::Result;
use keyring::Entry;

const SERVICE: &str = "com.grebeshok105.projectgallery";

fn entry(key: &str) -> Result<Entry> {
    Ok(Entry::new(SERVICE, key)?)
}

pub fn set_secret(key: &str, value: &str) -> Result<()> {
    let e = entry(key)?;
    if value.is_empty() {
        // пустое значение трактуем как удаление
        let _ = e.delete_credential();
        return Ok(());
    }
    e.set_password(value)?;
    Ok(())
}

pub fn get_secret(key: &str) -> Result<Option<String>> {
    let e = entry(key)?;
    match e.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.into()),
    }
}

pub fn has_secret(key: &str) -> bool {
    matches!(get_secret(key), Ok(Some(_)))
}

// Ключи секретов
pub const GITHUB_TOKEN: &str = "github_token";
pub const LLM_API_KEY: &str = "llm_api_key";
