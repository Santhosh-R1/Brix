use crate::app::{App, ResourceFocus};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Cell, Clear, Paragraph, Row, Table},
};

// Helper function to perfectly center popups on the screen
fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

pub fn render(f: &mut Frame, app: &mut App, area: Rect) {
    // Split vertically: 10 lines for the Form on top, the rest for the Table below
    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)])
        .split(area);

    render_form(f, app, main_chunks[0]);
    render_table(f, app, main_chunks[1]);

    // Render the Region Manager Overlay if activated (F6)
    if app.show_region_manager {
        render_region_manager(f, app, area);
    }
}

fn render_region_manager(f: &mut Frame, app: &mut App, area: Rect) {
    // Make a popup box that is 40% wide and 50% tall
    let popup_area = centered_rect(40, 50, area);

    // Clear the background so text doesn't bleed through
    f.render_widget(Clear, popup_area);

    let popup_block = Block::default()
        .title(" [ REGION MANAGER ] ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Magenta));

    let inner_area = popup_block.inner(popup_area);
    f.render_widget(popup_block, popup_area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Input
            Constraint::Min(0),    // Table
            Constraint::Length(1), // Footer Help
        ])
        .split(inner_area);

    // 1. New Region Input
    let input = Paragraph::new(app.region_input.value())
        .style(
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        )
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Add New Region (e.g. TVM) ")
                .border_style(Style::default().fg(Color::Yellow)),
        );
    f.render_widget(input, chunks[0]);
    f.set_cursor_position((
        chunks[0].x + app.region_input.visual_cursor() as u16 + 1,
        chunks[0].y + 1,
    ));

    // 2. Region List
    let rows: Vec<Row> = app
        .regions_data
        .iter()
        .map(|r| {
            Row::new(vec![Cell::from(r.name.clone())]).style(Style::default().fg(Color::White))
        })
        .collect();

    let table = Table::new(rows, [Constraint::Percentage(100)])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Saved Regions "),
        )
        .row_highlight_style(
            Style::default()
                .add_modifier(Modifier::REVERSED)
                .fg(Color::Cyan),
        )
        .highlight_symbol(">> ");

    f.render_stateful_widget(table, chunks[1], &mut app.region_table_state);

    // 3. Helper Text
    let help = Paragraph::new(" [ENTER] Add  |  [F4] Delete Selected  |  [ESC] Close ")
        .style(Style::default().fg(Color::DarkGray))
        .alignment(Alignment::Center);
    f.render_widget(help, chunks[2]);
}

fn render_form(f: &mut Frame, app: &App, area: Rect) {
    let form_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2),
            Constraint::Length(3),
            Constraint::Length(3),
        ])
        .margin(1)
        .split(area);

    let input_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(20),
            Constraint::Percentage(40),
            Constraint::Percentage(20),
            Constraint::Percentage(20),
        ])
        .split(form_chunks[1]);

    let submit_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Length(28), Constraint::Min(0)])
        .split(form_chunks[2]);

    let help_text = Paragraph::new("Cycle Inputs: [UP]/[DOWN]  |  Save: [ENTER] on COMMIT\nTable: [PgUp]/[PgDn] Scroll  |  [F2] Edit  |  [F3] Clear  |  [F4] Delete  |  [F6] Regions")
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(help_text, form_chunks[0]);

    let get_style = |is_active: bool| {
        if is_active {
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::White)
        }
    };
    let get_border = |is_active: bool| {
        if is_active {
            Color::Yellow
        } else {
            Color::DarkGray
        }
    };

    let is_code = app.res_focus == ResourceFocus::Code;
    let code_p = Paragraph::new(app.res_code.value())
        .style(get_style(is_code))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 1. Code (CEM-01) ")
                .border_style(Style::default().fg(get_border(is_code))),
        );
    f.render_widget(code_p, input_chunks[0]);
    if is_code {
        f.set_cursor_position((
            input_chunks[0].x + app.res_code.visual_cursor() as u16 + 1,
            input_chunks[0].y + 1,
        ));
    }

    let is_desc = app.res_focus == ResourceFocus::Description;
    let desc_p = Paragraph::new(app.res_desc.value())
        .style(get_style(is_desc))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 2. Description ")
                .border_style(Style::default().fg(get_border(is_desc))),
        );
    f.render_widget(desc_p, input_chunks[1]);
    if is_desc {
        f.set_cursor_position((
            input_chunks[1].x + app.res_desc.visual_cursor() as u16 + 1,
            input_chunks[1].y + 1,
        ));
    }

    let is_unit = app.res_focus == ResourceFocus::Unit;
    let unit_p = Paragraph::new(app.res_unit.value())
        .style(get_style(is_unit))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 3. Unit ")
                .border_style(Style::default().fg(get_border(is_unit))),
        );
    f.render_widget(unit_p, input_chunks[2]);
    if is_unit {
        f.set_cursor_position((
            input_chunks[2].x + app.res_unit.visual_cursor() as u16 + 1,
            input_chunks[2].y + 1,
        ));
    }

    let is_rate = app.res_focus == ResourceFocus::Rate;
    let rate_p = Paragraph::new(app.res_rate.value())
        .style(get_style(is_rate))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 4. Region Rates ")
                .border_style(Style::default().fg(get_border(is_rate))),
        );
    f.render_widget(rate_p, input_chunks[3]);
    if is_rate {
        f.set_cursor_position((
            input_chunks[3].x + app.res_rate.visual_cursor() as u16 + 1,
            input_chunks[3].y + 1,
        ));
    }

    let is_submit = app.res_focus == ResourceFocus::Submit;
    let is_editing = app.res_edit_id.is_some();
    let submit_text = if is_editing {
        " [ UPDATE RECORD ] "
    } else {
        " [ COMMIT RECORD ] "
    };
    let submit_bg = if is_editing {
        Color::Blue
    } else {
        Color::Green
    };

    let submit_btn = Paragraph::new(submit_text)
        .alignment(Alignment::Center)
        .style(if is_submit {
            Style::default()
                .fg(Color::Black)
                .bg(submit_bg)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::DarkGray)
        })
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(submit_btn, submit_chunks[0]);

    let status_color = if app.res_status_message.starts_with("ERROR") {
        Color::Red
    } else if app.res_status_message.starts_with("EDITING") {
        Color::Blue
    } else {
        Color::Green
    };
    let status_block = Paragraph::new(app.res_status_message.clone())
        .style(
            Style::default()
                .fg(status_color)
                .add_modifier(Modifier::BOLD),
        )
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" SYSTEM STATUS ")
                .border_style(Style::default().fg(Color::DarkGray)),
        );
    f.render_widget(status_block, submit_chunks[1]);
}

fn render_table(f: &mut Frame, app: &mut App, area: Rect) {
    let header_cells = ["CODE", "DESCRIPTION", "UNIT", "REGION RATES"]
        .iter()
        .map(|h| {
            Cell::from(*h).style(
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
        .resources_data
        .iter()
        .map(|item| {
            let sym = &app.currency_symbol;
            let rate_str = if let Some(rates_json) = &item.rates {
                if let Ok(parsed) =
                    serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(rates_json)
                {
                    let mut entries = Vec::new();
                    for (region, rate) in parsed.iter() {
                        // Handle BOTH JSON Numbers and JSON Strings gracefully
                        let val = rate.as_f64().unwrap_or_else(|| {
                            rate.as_str()
                                .and_then(|s| s.parse::<f64>().ok())
                                .unwrap_or(0.0)
                        });
                        entries.push(format!("{}: {}{:.2}", region, sym, val));
                    }
                    if entries.is_empty() {
                        format!("{}0.00", sym)
                    } else {
                        entries.join(" | ")
                    }
                } else {
                    format!("{}0.00", sym)
                }
            } else {
                format!("{}0.00", sym)
            };

            Row::new(vec![
                Cell::from(item.code.as_deref().unwrap_or("").to_string())
                    .style(Style::default().fg(Color::Yellow)),
                Cell::from(item.description.as_deref().unwrap_or("").to_string()),
                Cell::from(item.unit.as_deref().unwrap_or("").to_string()),
                Cell::from(rate_str),
            ])
            .height(1)
        })
        .collect();

    let table = Table::new(
        rows,
        [
            Constraint::Length(15),
            Constraint::Min(30),
            Constraint::Length(10),
            Constraint::Length(35),
        ],
    )
    .header(header)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .title(" MASTER RESOURCE DATABASE "),
    )
    .row_highlight_style(Style::default().add_modifier(Modifier::REVERSED))
    .highlight_symbol(">> ");

    f.render_stateful_widget(table, area, &mut app.res_table_state);
}
