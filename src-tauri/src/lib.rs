//! The desktop shell around the web app. It only does what a browser cannot: read and write the
//! files in `subjects/` and `data/`, and open those folders in the file manager.

mod folders;

use folders::{checked_name, Folders};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{Manager, State, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

type CommandResult<T> = Result<T, String>;

fn text(e: std::io::Error) -> String {
    e.to_string()
}

/// Writes to a temporary file first, so a crash never leaves a half-written file behind.
fn write_atomic(path: &Path, bytes: &[u8]) -> CommandResult<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes).map_err(text)?;
    fs::rename(&tmp, path).map_err(text)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderInfo {
    subjects: String,
    data: String,
    writable: bool,
}

#[tauri::command]
fn folders(folders: State<Folders>) -> FolderInfo {
    FolderInfo {
        subjects: folders.subjects.display().to_string(),
        data: folders.data.display().to_string(),
        writable: folders.writable,
    }
}

/// Names of the .json and .zip files in subjects/, sorted.
#[tauri::command]
fn list_bank_files(folders: State<Folders>) -> CommandResult<Vec<String>> {
    let mut names: Vec<String> = fs::read_dir(&folders.subjects)
        .map_err(text)?
        .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
        .filter(|name| {
            let lower = name.to_lowercase();
            !name.starts_with('.') && (lower.ends_with(".json") || lower.ends_with(".zip"))
        })
        .collect();
    names.sort();
    Ok(names)
}

/// Raw bytes of a bank file (arrives in JavaScript as an ArrayBuffer).
#[tauri::command]
fn read_bank_file(folders: State<Folders>, name: String) -> CommandResult<Response> {
    let bytes = fs::read(folders.subjects.join(checked_name(&name)?)).map_err(text)?;
    Ok(Response::new(bytes))
}

/// Saves a bank file. The body is the raw file, the name comes in the `x-file-name` header.
#[tauri::command]
fn write_bank_file(folders: State<Folders>, request: Request<'_>) -> CommandResult<()> {
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .ok_or("Missing x-file-name header")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the file as raw bytes".into());
    };
    write_atomic(&folders.subjects.join(checked_name(name)?), bytes)
}

#[tauri::command]
fn delete_bank_file(folders: State<Folders>, name: String) -> CommandResult<()> {
    fs::remove_file(folders.subjects.join(checked_name(&name)?)).map_err(text)
}

/// Contents of a text file in data/, or null if it does not exist yet.
#[tauri::command]
fn read_data(folders: State<Folders>, name: String) -> CommandResult<Option<String>> {
    match fs::read_to_string(folders.data.join(checked_name(&name)?)) {
        Ok(contents) => Ok(Some(contents)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(text(e)),
    }
}

#[tauri::command]
fn write_data(folders: State<Folders>, name: String, contents: String) -> CommandResult<()> {
    write_atomic(&folders.data.join(checked_name(&name)?), contents.as_bytes())
}

/// Appends one line to a file in data/ (the attempt log is append-only).
#[tauri::command]
fn append_data(folders: State<Folders>, name: String, line: String) -> CommandResult<()> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(folders.data.join(checked_name(&name)?))
        .map_err(text)?;
    writeln!(file, "{line}").map_err(text)?;
    file.sync_data().map_err(text)
}

#[tauri::command]
fn open_folder(app: tauri::AppHandle, folders: State<Folders>, which: String) -> CommandResult<()> {
    let path = match which.as_str() {
        "subjects" => &folders.subjects,
        "data" => &folders.data,
        _ => return Err(format!("Unknown folder: {which}")),
    };
    app.opener().open_path(path.display().to_string(), None::<&str>).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let folders = Folders::resolve();
            // The web view keeps its own storage and cache in data/ as well, not in the user
            // profile (Windows and Linux; macOS does not allow moving it). If data/ is not
            // writable, a temporary folder is used just long enough to show that message.
            let webview_data = if folders.writable {
                folders.data.join("webview")
            } else {
                std::env::temp_dir().join("lia-webview")
            };
            app.manage(folders);
            WebviewWindowBuilder::from_config(app.handle(), &app.config().app.windows[0])?
                .data_directory(webview_data)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            folders,
            list_bank_files,
            read_bank_file,
            write_bank_file,
            delete_bank_file,
            read_data,
            write_data,
            append_data,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running lia");
}
