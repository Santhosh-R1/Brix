use crate::app::{App, ServerFocus};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, List, ListItem, Paragraph, Row, Table},
};

pub fn render(f: &mut Frame, app: &mut App, area: Rect) {
    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // KPIs
            Constraint::Length(7), // Server Config
            Constraint::Min(0),    // Traffic + Logs
        ])
        .split(area);

    // 1. KPI Blocks
    let kpi_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(25),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
        ])
        .split(main_chunks[0]);

    let kpis = [
        (
            " ACTIVE PROJECTS ",
            app.active_projects_count,
            Color::Yellow,
        ),
        (" INTERNAL STAFF ", app.total_staff, Color::Blue),
        (" CRM CLIENTS ", app.total_clients, Color::Green),
        (" SUPPLY CHAIN ", app.total_suppliers, Color::Magenta),
    ];

    for (i, (title, val, color)) in kpis.iter().enumerate() {
        let p = Paragraph::new(format!(" {}", val))
            .style(
                Style::default()
                    .fg(Color::White)
                    .add_modifier(Modifier::BOLD),
            )
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title(*title)
                    .border_style(Style::default().fg(*color)),
            )
            .alignment(Alignment::Center);
        f.render_widget(p, kpi_chunks[i]);
    }

    // 2. Server Config
    render_config(f, app, main_chunks[1]);

    // 3. Traffic and Logs
    let bottom_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(40), Constraint::Percentage(60)])
        .split(main_chunks[2]);

    render_traffic(f, app, bottom_chunks[0]);
    render_logs(f, app, bottom_chunks[1]);
}

fn focused_border(focused: bool) -> Style {
    if focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    }
}

fn render_config(f: &mut Frame, app: &mut App, area: Rect) {
    let block = Block::default()
        .title(" ⚙  SERVER CONFIGURATION ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let columns = Layout::default()
        .direction(Direction::Horizontal)
        .margin(1)
        .constraints([
            Constraint::Length(34),
            Constraint::Length(2),
            Constraint::Min(0),
            Constraint::Length(20),
        ])
        .split(inner);

    let port_focused = app.server_focus == ServerFocus::PortInput;
    let port_val = app.server_port_input.value();
    let cursor_char = if port_focused { "█" } else { "" };

    let port_paragraph = Paragraph::new(Line::from(vec![Span::styled(
        format!("Port: {}{}", port_val, cursor_char),
        if port_focused {
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::White)
        },
    )]))
    .block(
        Block::default()
            .title(" [ Port ] ")
            .borders(Borders::ALL)
            .border_style(focused_border(port_focused)),
    )
    .alignment(Alignment::Left);
    f.render_widget(port_paragraph, columns[0]);

    let (status_label, status_color) = if app.server_running || app.daemon_raw.is_some() {
        ("● ONLINE", Color::Green)
    } else {
        ("○ OFFLINE", Color::Red)
    };
    let daemon_line = if let Some(ref d) = app.daemon_raw {
        format!("PID: {}  Port: {}", d.pid, d.port)
    } else {
        "Daemon not detected".to_string()
    };

    let status_text = Paragraph::new(vec![
        Line::from(Span::styled(
            status_label,
            Style::default()
                .fg(status_color)
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            daemon_line,
            Style::default().fg(Color::DarkGray),
        )),
        Line::from(Span::styled(
            "[Tab] cycle focus  [Enter] act",
            Style::default()
                .fg(Color::DarkGray)
                .add_modifier(Modifier::DIM),
        )),
    ])
    .block(Block::default().borders(Borders::NONE))
    .alignment(Alignment::Left);
    f.render_widget(status_text, columns[2]);

    let btn_focused = app.server_focus == ServerFocus::StartStop;
    let (btn_label, btn_bg, btn_fg) = if app.server_running || app.daemon_raw.is_some() {
        ("  ■  STOP SERVER  ", Color::Red, Color::White)
    } else {
        ("  ▶  START SERVER ", Color::Green, Color::Black)
    };

    let btn_style = if btn_focused {
        Style::default()
            .bg(btn_bg)
            .fg(btn_fg)
            .add_modifier(Modifier::BOLD)
    } else {
        Style::default()
            .bg(Color::DarkGray)
            .fg(Color::White)
            .add_modifier(Modifier::DIM)
    };
    let focus_indicator = if btn_focused { "► " } else { "  " };

    let btn_paragraph = Paragraph::new(Line::from(vec![Span::styled(
        format!("{}{}", focus_indicator, btn_label.trim()),
        btn_style,
    )]))
    .block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(if btn_focused {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::DarkGray)
            }),
    )
    .alignment(Alignment::Center);
    f.render_widget(btn_paragraph, columns[3]);
}

fn render_traffic(f: &mut Frame, app: &App, area: Rect) {
    let focused = app.server_focus == ServerFocus::TrafficTable;
    let header = Row::new(vec!["TIME", "MTHD", "PATH", "CODE"]).style(
        Style::default()
            .fg(Color::Cyan)
            .add_modifier(Modifier::BOLD),
    );

    let rows: Vec<Row> = app
        .server_traffic
        .iter()
        .rev()
        .map(|t| {
            let color = if t.status >= 400 {
                Color::Red
            } else {
                Color::Green
            };
            Row::new(vec![
                Cell::from(t.timestamp.clone()),
                Cell::from(t.method.clone()),
                Cell::from(t.path.clone()),
                Cell::from(t.status.to_string()).style(Style::default().fg(color)),
            ])
        })
        .collect();

    let table = Table::new(
        rows,
        [
            Constraint::Length(10),
            Constraint::Length(6),
            Constraint::Min(10),
            Constraint::Length(5),
        ],
    )
    .header(header)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(focused_border(focused))
            .title(" NETWORK TRAFFIC MONITOR "),
    )
    .column_spacing(1);
    f.render_widget(table, area);
}

fn render_logs(f: &mut Frame, app: &App, area: Rect) {
    let focused = app.server_focus == ServerFocus::LogArea;
    let logs: Vec<ListItem> = app
        .server_logs
        .iter()
        .rev()
        .map(|log| {
            let color = if log.contains("ERROR") {
                Color::Red
            } else if log.contains("START") || log.contains("STOP") || log.contains("SUCCESS") {
                Color::Yellow
            } else {
                Color::DarkGray
            };
            ListItem::new(log.as_str()).style(Style::default().fg(color))
        })
        .collect();

    let list = List::new(logs)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_style(focused_border(focused))
                .title(" KERNEL / DAEMON LOG STREAM "),
        )
        .style(Style::default().fg(Color::White));
    f.render_widget(list, area);
}
