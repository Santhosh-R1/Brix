pub mod archive;
pub mod dashboard;
pub mod databook;
pub mod directory;
pub mod resources;

use crate::app::{App, Page};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::Line,
    widgets::{Block, Borders, Paragraph, Tabs},
};

pub fn ui(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(1),
        ])
        .split(f.area());

    render_tabs(f, app, chunks[0]);

    match app.active_page {
        Page::Dashboard => dashboard::render(f, app, chunks[1]),
        Page::Resources => resources::render(f, app, chunks[1]),
        Page::Databook => databook::render(f, app, chunks[1]),
        Page::ProjectArchive => archive::render(f, app, chunks[1]),
        Page::Directory => directory::render(f, app, chunks[1]),
    }

    render_footer(f, app, chunks[2]);
}

fn render_tabs(f: &mut Frame, app: &App, area: Rect) {
    let titles: Vec<Line> = vec![
        " 1.DASHBOARD ",
        " 2.RESOURCES ",
        " 3.DATABOOK ",
        " 4.ARCHIVE ",
        " 5.DIRECTORY ",
    ]
    .into_iter()
    .map(Line::from)
    .collect();

    let active_index = match app.active_page {
        Page::Dashboard => 0,
        Page::Resources => 1,
        Page::Databook => 2,
        Page::ProjectArchive => 3,
        Page::Directory => 4,
    };

    let tabs = Tabs::new(titles)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" // OPENPRIX_TERMINAL "),
        )
        .highlight_style(
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD)
                .bg(Color::DarkGray),
        )
        .select(active_index)
        .divider(" | ");

    f.render_widget(tabs, area);
}

fn render_footer(f: &mut Frame, app: &App, area: Rect) {
    let footer_text = format!(
        " [RIGHT] Next | [LEFT] Prev | [F5] Refresh | [ESC] Quit  ||  {}",
        app.daemon_status_text
    );
    let footer =
        Paragraph::new(footer_text).style(Style::default().bg(Color::DarkGray).fg(Color::White));
    f.render_widget(footer, area);
}
