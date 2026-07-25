use crate::app::App;
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    symbols,
    text::{Line, Span},
    widgets::{
        Axis, BarChart, Block, Borders, Cell, Chart, Dataset, GraphType, Paragraph, Row, Table,
    },
};

pub fn render(f: &mut Frame, app: &mut App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(area);

    render_list(f, app, chunks[0]);
    render_details(f, app, chunks[1]);
}

fn render_list(f: &mut Frame, app: &mut App, area: Rect) {
    let header_cells = ["CODE", "NAME", "STATUS"].into_iter().map(|h| {
        Cell::from(h).style(
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        )
    });
    let header = Row::new(header_cells)
        .style(Style::default().bg(Color::DarkGray))
        .height(1)
        .bottom_margin(1);

    let rows: Vec<Row> = app
        .archive_data
        .iter()
        .map(|p| {
            let status_color = match p.status.as_deref().unwrap_or("Active") {
                "Completed" | "Archived" => Color::DarkGray,
                "Active" | "In Progress" => Color::Green,
                "On Hold" => Color::Yellow,
                _ => Color::White,
            };
            Row::new(vec![
                Cell::from(p.code.as_deref().unwrap_or("-").to_string())
                    .style(Style::default().fg(Color::Yellow)),
                Cell::from(p.name.as_deref().unwrap_or("Unknown").to_string()),
                Cell::from(p.status.as_deref().unwrap_or("Active").to_string())
                    .style(Style::default().fg(status_color)),
            ])
            .height(1)
        })
        .collect();

    let table = Table::new(
        rows,
        [
            Constraint::Length(10),
            Constraint::Min(20),
            Constraint::Length(12),
        ],
    )
    .header(header)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .title(" PROJECT PORTFOLIO [Up/Down] ")
            .border_style(Style::default().fg(Color::Blue)),
    )
    .row_highlight_style(
        Style::default()
            .add_modifier(Modifier::REVERSED)
            .fg(Color::Cyan),
    )
    .highlight_symbol(">> ");

    f.render_stateful_widget(table, area, &mut app.archive_table_state);
}

fn render_details(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" PORTFOLIO METRICS & ANALYTICS ")
        .border_style(Style::default().fg(Color::DarkGray));
    let inner = block.inner(area);
    f.render_widget(block, area);

    if let Some(i) = app.archive_table_state.selected() {
        if let Some(p) = app.archive_data.get(i) {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(4),  // Project Info
                    Constraint::Length(4),  // Timeline
                    Constraint::Min(10),    // S-Curve Line Chart
                    Constraint::Length(10), // Bottom Row (Budget & Cashflow)
                ])
                .split(inner);

            // 1. Text Information
            let info_text = vec![
                Line::from(vec![
                    Span::styled("Project: ", Style::default().fg(Color::DarkGray)),
                    Span::styled(
                        p.name.as_deref().unwrap_or("Unknown"),
                        Style::default()
                            .fg(Color::White)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(
                        format!("  [{}]", p.code.as_deref().unwrap_or("-")),
                        Style::default().fg(Color::Yellow),
                    ),
                ]),
                Line::from(format!(
                    "Client: {}  |  Region: {}  |  Type: {}",
                    p.client_name.as_deref().unwrap_or("-"),
                    p.region.as_deref().unwrap_or("-"),
                    p.project_type.as_deref().unwrap_or("-")
                )),
                Line::from(format!(
                    "Lead: {}  |  Status: {}",
                    p.project_lead.as_deref().unwrap_or("Unassigned"),
                    p.status.as_deref().unwrap_or("Active")
                )),
            ];
            f.render_widget(Paragraph::new(info_text), chunks[0]);

            // 🔥 PARSE REAL DATABASE ARRAYS (Gantt, Bills, Phases)
            let tasks: Vec<serde_json::Value> = p
                .gantt_tasks
                .as_ref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();
            let bills: Vec<serde_json::Value> = p
                .ra_bills
                .as_ref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();
            let phases: Vec<serde_json::Value> = p
                .phase_assignments
                .as_ref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();

            // 2. Project Timeline (Dynamic from Gantt Tasks)
            let mut tl_spans = vec![];
            if tasks.is_empty() {
                tl_spans.push(Span::styled(
                    "[ No Gantt Tasks Available in DB ]",
                    Style::default().fg(Color::DarkGray),
                ));
            } else {
                for (idx, task) in tasks.iter().take(5).enumerate() {
                    let name = task
                        .get("name")
                        .or_else(|| task.get("title"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Task");
                    let progress = task.get("progress").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let color = if progress >= 100.0 {
                        Color::Green
                    } else if progress > 0.0 {
                        Color::Yellow
                    } else {
                        Color::DarkGray
                    };

                    tl_spans.push(Span::styled(
                        format!("[{}] ", name),
                        Style::default().fg(color),
                    ));
                    if idx < tasks.len().min(5) - 1 {
                        tl_spans.push(Span::styled("──── ", Style::default().fg(Color::DarkGray)));
                    }
                }
            }

            let tl_text = vec![
                Line::from(Span::styled(
                    " PROJECT TIMELINE (Gantt Tracker) ",
                    Style::default()
                        .fg(Color::Cyan)
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(tl_spans),
            ];
            f.render_widget(
                Paragraph::new(tl_text).block(
                    Block::default()
                        .borders(Borders::BOTTOM)
                        .border_style(Style::default().fg(Color::DarkGray)),
                ),
                chunks[1],
            );

            // 3. S-Curve Chart (Real Planned vs Actual Progress based on Tasks)
            let mut planned_data = vec![(0.0, 0.0)];
            let mut actual_data = vec![(0.0, 0.0)];

            if tasks.is_empty() {
                // Provide an empty flatline if no data exists
                planned_data.push((6.0, 0.0));
                actual_data.push((6.0, 0.0));
            } else {
                let mut p_cum = 0.0;
                let mut a_cum = 0.0;
                let increment = 100.0 / (tasks.len() as f64).max(1.0);

                for (i, task) in tasks.iter().enumerate() {
                    let x = (i + 1) as f64;
                    let prog = task.get("progress").and_then(|v| v.as_f64()).unwrap_or(0.0);

                    p_cum = (p_cum + increment).min(100.0);
                    a_cum = (a_cum + (increment * (prog / 100.0))).min(100.0);

                    planned_data.push((x, p_cum));
                    actual_data.push((x, a_cum));
                }
            }

            let datasets = vec![
                Dataset::default()
                    .name("Planned %")
                    .marker(symbols::Marker::Braille)
                    .graph_type(GraphType::Line)
                    .style(Style::default().fg(Color::Blue))
                    .data(&planned_data),
                Dataset::default()
                    .name("Actual %")
                    .marker(symbols::Marker::Braille)
                    .graph_type(GraphType::Line)
                    .style(Style::default().fg(Color::Yellow))
                    .data(&actual_data),
            ];

            let max_x = (tasks.len() as f64).max(6.0);
            let chart = Chart::new(datasets)
                .block(
                    Block::default()
                        .title(" S-Curve (Cumulative Progress) ")
                        .borders(Borders::ALL),
                )
                .x_axis(
                    Axis::default()
                        .title("Tasks/Time")
                        .style(Style::default().fg(Color::Gray))
                        .bounds([0.0, max_x])
                        .labels(vec![
                            Span::from("Start"),
                            Span::from("Mid"),
                            Span::from("End"),
                        ]),
                )
                .y_axis(
                    Axis::default()
                        .title("% Complete")
                        .style(Style::default().fg(Color::Gray))
                        .bounds([0.0, 100.0])
                        .labels(vec![
                            Span::from("0%"),
                            Span::from("50%"),
                            Span::from("100%"),
                        ]),
                );
            f.render_widget(chart, chunks[2]);

            // 4. Bottom Row Charts
            let bottom_chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
                .split(chunks[3]);

            // 4a. Budget Distribution by Phase (Real DB Array)
            let mut budget_owned = Vec::new();
            if phases.is_empty() {
                budget_owned.push(("N/A".to_string(), 0_u64));
            } else {
                for phase in phases.iter().take(6) {
                    let name = phase
                        .get("name")
                        .or_else(|| phase.get("phase"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Phase");
                    let val = phase
                        .get("budget")
                        .or_else(|| phase.get("amount"))
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0) as u64;
                    budget_owned.push((name.chars().take(5).collect::<String>(), val));
                }
            }
            let budget_data: Vec<(&str, u64)> =
                budget_owned.iter().map(|(s, v)| (s.as_str(), *v)).collect();

            let budget_chart = BarChart::default()
                .block(
                    Block::default()
                        .title(" Budget by Phase ")
                        .borders(Borders::ALL),
                )
                .data(&budget_data)
                .bar_width(6)
                .bar_gap(2)
                .bar_style(Style::default().fg(Color::Magenta))
                .value_style(Style::default().fg(Color::Black).bg(Color::White));
            f.render_widget(budget_chart, bottom_chunks[0]);

            // 4b. Monthly Revenue / Cash Flow (Real RA Bills)
            let mut cashflow_owned = Vec::new();
            if bills.is_empty() {
                cashflow_owned.push(("N/A".to_string(), 0_u64));
            } else {
                for bill in bills.iter().rev().take(6) {
                    let label = bill
                        .get("billNo")
                        .or_else(|| bill.get("date"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Bill");
                    let amount = bill
                        .get("grandTotal")
                        .or_else(|| bill.get("amount"))
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0) as u64;
                    cashflow_owned.push((label.chars().take(6).collect::<String>(), amount));
                }
            }
            let cashflow_data: Vec<(&str, u64)> = cashflow_owned
                .iter()
                .map(|(s, v)| (s.as_str(), *v))
                .collect();

            let cashflow_chart = BarChart::default()
                .block(
                    Block::default()
                        .title(" RA Bills / Cash Flow ")
                        .borders(Borders::ALL),
                )
                .data(&cashflow_data)
                .bar_width(6)
                .bar_gap(1)
                .bar_style(Style::default().fg(Color::Green))
                .value_style(Style::default().fg(Color::Black).bg(Color::White));
            f.render_widget(cashflow_chart, bottom_chunks[1]);

            return;
        }
    }

    f.render_widget(
        Paragraph::new("\n\nNo Project Selected.")
            .alignment(Alignment::Center)
            .style(Style::default().fg(Color::DarkGray)),
        inner,
    );
}
