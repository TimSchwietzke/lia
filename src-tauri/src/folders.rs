//! Where lia keeps question banks (`subjects/`) and progress (`data/`).
//!
//! Portable layout: both folders sit next to the app (the `.exe`, the `.app` bundle or the
//! `.AppImage`). If that folder is not writable (Program Files, a read-only volume, a macOS
//! "translocated" app), lia falls back to the per-user app data folder.

use std::fs;
use std::path::{Path, PathBuf};

pub struct Folders {
    pub subjects: PathBuf,
    pub data: PathBuf,
    /// True if the folders are next to the app, false if lia fell back to the app data folder.
    pub portable: bool,
}

impl Folders {
    pub fn resolve(app_data_dir: PathBuf) -> Folders {
        if let Some(base) = portable_base() {
            let folders = Folders::inside(&base, true);
            if folders.prepare().is_ok() {
                return folders;
            }
        }
        let folders = Folders::inside(&app_data_dir, false);
        // If even this fails, the file commands report the error when they are used.
        let _ = folders.prepare();
        folders
    }

    fn inside(base: &Path, portable: bool) -> Folders {
        Folders { subjects: base.join("subjects"), data: base.join("data"), portable }
    }

    /// Creates both folders and proves that `data/` is writable.
    fn prepare(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.subjects)?;
        fs::create_dir_all(&self.data)?;
        let probe = self.data.join(".write-test");
        fs::write(&probe, b"ok")?;
        fs::remove_file(probe)
    }
}

/// The folder the portable layout lives in.
fn portable_base() -> Option<PathBuf> {
    // `tauri dev`: use the repository, so the dev app sees the repo's subjects/ and a git-ignored data/.
    if cfg!(debug_assertions) {
        return Path::new(env!("CARGO_MANIFEST_DIR")).parent().map(Path::to_path_buf);
    }
    let appimage = std::env::var_os("APPIMAGE").map(PathBuf::from);
    base_from(&std::env::current_exe().ok()?, appimage.as_deref())
}

/// The folder that contains the app as the user sees it, given the running executable.
fn base_from(exe: &Path, appimage: Option<&Path>) -> Option<PathBuf> {
    // Linux AppImage: the executable runs from a temporary mount; $APPIMAGE is the real file.
    if let Some(appimage) = appimage {
        return appimage.parent().map(Path::to_path_buf);
    }
    let dir = exe.parent()?;
    // macOS: lia.app/Contents/MacOS/lia -> the folder that contains lia.app
    if dir.ends_with("Contents/MacOS") {
        return dir.parent()?.parent()?.parent().map(Path::to_path_buf);
    }
    Some(dir.to_path_buf())
}

/// Accepts plain file names only, so commands can never reach outside their folder.
pub fn checked_name(name: &str) -> Result<&str, String> {
    let ok = !name.is_empty()
        && name.len() <= 255
        && !name.starts_with('.')
        && !name.contains(['/', '\\', ':', '\0']);
    if ok {
        Ok(name)
    } else {
        Err(format!("Invalid file name: {name:?}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_and_plain_linux_use_the_executable_folder() {
        assert_eq!(
            base_from(Path::new("/home/me/lia/lia"), None),
            Some(PathBuf::from("/home/me/lia"))
        );
    }

    #[test]
    fn macos_uses_the_folder_around_the_app_bundle() {
        assert_eq!(
            base_from(Path::new("/Users/me/lia/lia.app/Contents/MacOS/lia"), None),
            Some(PathBuf::from("/Users/me/lia"))
        );
    }

    #[test]
    fn appimage_uses_the_folder_of_the_appimage_file() {
        assert_eq!(
            base_from(
                Path::new("/tmp/.mount_liaXYZ/usr/bin/lia"),
                Some(Path::new("/home/me/lia/lia.AppImage"))
            ),
            Some(PathBuf::from("/home/me/lia"))
        );
    }

    #[test]
    fn only_plain_file_names_pass() {
        assert!(checked_name("algorithms.json").is_ok());
        assert!(checked_name("Größe 2.zip").is_ok());
        for bad in ["", ".hidden", "..", "../x.json", "a/b.json", "a\\b.json", "c:x"] {
            assert!(checked_name(bad).is_err(), "{bad} should be rejected");
        }
    }

    #[test]
    fn prepare_creates_both_folders_where_writable() {
        let root = std::env::temp_dir().join(format!("lia-test-{}", std::process::id()));
        let folders = Folders::inside(&root, true);
        assert!(folders.prepare().is_ok());
        assert!(folders.subjects.is_dir() && folders.data.is_dir());
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn prepare_fails_where_not_writable() {
        assert!(Folders::inside(Path::new("/proc/lia"), true).prepare().is_err());
    }
}
