#[derive(Debug)]
pub enum LibraryError {
    SerdeJson(serde_json::Error),
    NotFound(String),
    InvalidInput(String),
}

impl From<serde_json::Error> for LibraryError {
    fn from(e: serde_json::Error) -> Self {
        LibraryError::SerdeJson(e)
    }
}

impl std::fmt::Display for LibraryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LibraryError::SerdeJson(e) => write!(f, "JSON error: {}", e),
            LibraryError::NotFound(s) => write!(f, "Not found: {}", s),
            LibraryError::InvalidInput(s) => write!(f, "Invalid input: {}", s),
        }
    }
}
