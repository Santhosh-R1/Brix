use crate::app::{App, DatabookFocus};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table, Wrap},
};
use serde_json::Value;

pub fn render(f: &mut Frame, app: &mut App, area: Rect) {
    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)])
        .split(area);
    let bottom_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(main_chunks[1]);

    render_form(f, app, main_chunks[0]);
    render_table(f, app, bottom_chunks[0]);
    render_details(f, app, bottom_chunks[1]);
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
            Constraint::Percentage(15),
            Constraint::Percentage(25),
            Constraint::Percentage(10),
            Constraint::Percentage(15),
            Constraint::Percentage(35),
        ])
        .split(form_chunks[1]);
    let submit_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Length(28), Constraint::Min(0)])
        .split(form_chunks[2]);

    let help = Paragraph::new(
        "Cycle: [UP]/[DOWN]  |  Table: [PgUp]/[PgDn]  |  [F2] Edit  |  [F3] Clear  |  [F4] Delete",
    )
    .style(Style::default().fg(Color::DarkGray));
    f.render_widget(help, form_chunks[0]);

    let get_style = |is_active| {
        if is_active {
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::White)
        }
    };
    let get_border = |is_active| {
        if is_active {
            Color::Yellow
        } else {
            Color::DarkGray
        }
    };

    let is_code = app.dbk_focus == DatabookFocus::Code;
    let code_p = Paragraph::new(app.dbk_code.value())
        .style(get_style(is_code))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 1. Code ")
                .border_style(Style::default().fg(get_border(is_code))),
        );
    f.render_widget(code_p, input_chunks[0]);
    if is_code {
        f.set_cursor_position((
            input_chunks[0].x + app.dbk_code.visual_cursor() as u16 + 1,
            input_chunks[0].y + 1,
        ));
    }

    let is_desc = app.dbk_focus == DatabookFocus::Description;
    let desc_p = Paragraph::new(app.dbk_desc.value())
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
            input_chunks[1].x + app.dbk_desc.visual_cursor() as u16 + 1,
            input_chunks[1].y + 1,
        ));
    }

    let is_unit = app.dbk_focus == DatabookFocus::Unit;
    let unit_p = Paragraph::new(app.dbk_unit.value())
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
            input_chunks[2].x + app.dbk_unit.visual_cursor() as u16 + 1,
            input_chunks[2].y + 1,
        ));
    }

    let is_marg = app.dbk_focus == DatabookFocus::Margins;
    let marg_p = Paragraph::new(app.dbk_margins.value())
        .style(get_style(is_marg))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 4. OH:Profit ")
                .border_style(Style::default().fg(get_border(is_marg))),
        );
    f.render_widget(marg_p, input_chunks[3]);
    if is_marg {
        f.set_cursor_position((
            input_chunks[3].x + app.dbk_margins.visual_cursor() as u16 + 1,
            input_chunks[3].y + 1,
        ));
    }

    let is_comp = app.dbk_focus == DatabookFocus::Components;
    let comp_p = Paragraph::new(app.dbk_comps.value())
        .style(get_style(is_comp))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 5. Components (CODE:QTY:TYPE, ...) ")
                .border_style(Style::default().fg(get_border(is_comp))),
        );
    f.render_widget(comp_p, input_chunks[4]);
    if is_comp {
        f.set_cursor_position((
            input_chunks[4].x + app.dbk_comps.visual_cursor() as u16 + 1,
            input_chunks[4].y + 1,
        ));
    }

    let is_submit = app.dbk_focus == DatabookFocus::Submit;
    let btn_bg = if app.dbk_edit_id.is_some() {
        Color::Blue
    } else {
        Color::Green
    };
    let btn_text = if app.dbk_edit_id.is_some() {
        " [ UPDATE ASSEMBLY ] "
    } else {
        " [ COMMIT ASSEMBLY ] "
    };
    let submit_btn = Paragraph::new(btn_text)
        .alignment(Alignment::Center)
        .style(if is_submit {
            Style::default()
                .fg(Color::Black)
                .bg(btn_bg)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::DarkGray)
        })
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(submit_btn, submit_chunks[0]);

    let stat_col = if app.dbk_status_message.contains("ERROR") {
        Color::Red
    } else {
        Color::Green
    };
    let stat = Paragraph::new(app.dbk_status_message.clone())
        .style(Style::default().fg(stat_col).add_modifier(Modifier::BOLD))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" SYSTEM STATUS "),
        );
    f.render_widget(stat, submit_chunks[1]);
}

fn render_table(f: &mut Frame, app: &mut App, area: Rect) {
    let header_cells = ["CODE", "DESCRIPTION", "UNIT"].iter().map(|h| {
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
        .databook_data
        .iter()
        .map(|item| {
            Row::new(vec![
                Cell::from(item.item_code.as_deref().unwrap_or("").to_string())
                    .style(Style::default().fg(Color::Yellow)),
                Cell::from(item.description.as_deref().unwrap_or("").to_string()),
                Cell::from(item.unit.as_deref().unwrap_or("").to_string()),
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
        ],
    )
    .header(header)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .title(" MASTER BOQ DATABOOK [PgUp/PgDn] "),
    )
    .row_highlight_style(
        Style::default()
            .add_modifier(Modifier::REVERSED)
            .fg(Color::Cyan),
    )
    .highlight_symbol(">> ");

    f.render_stateful_widget(table, area, &mut app.dbk_table_state);
}

fn render_details(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" ASSEMBLY RECIPE ")
        .border_style(Style::default().fg(Color::DarkGray));
    let inner_area = block.inner(area);
    f.render_widget(block, area);

    if let Some(selected_idx) = app.dbk_table_state.selected() {
        if let Some(boq) = app.databook_data.get(selected_idx) {
            let code = boq.item_code.as_deref().unwrap_or("UNKNOWN");
            let desc = boq.description.as_deref().unwrap_or("No Description");
            let unit = boq.unit.as_deref().unwrap_or("-");
            let oh = boq.overhead.unwrap_or(0.0);
            let profit = boq.profit.unwrap_or(0.0);

            let mut text = vec![
                Line::from(vec![Span::styled(
                    format!("Item Code: {}", code),
                    Style::default()
                        .fg(Color::Yellow)
                        .add_modifier(Modifier::BOLD),
                )]),
                Line::from(vec![Span::styled(
                    desc.to_string(),
                    Style::default().fg(Color::White),
                )]),
                Line::from(format!(
                    "Unit: {}  |  Overhead: {}%  |  Profit: {}%",
                    unit, oh, profit
                )),
                Line::from(""),
                Line::from(Span::styled(
                    "--- RESOURCE COMPONENTS ---",
                    Style::default()
                        .fg(Color::Cyan)
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
            ];

            if let Some(comp_json) = &boq.components {
                if let Ok(comps) = serde_json::from_str::<Vec<Value>>(comp_json) {
                    if comps.is_empty() {
                        text.push(Line::from(Span::styled(
                            "No components mapped.",
                            Style::default().fg(Color::DarkGray),
                        )));
                    } else {
                        for comp in comps {
                            let mut r_type = comp
                                .get("type")
                                .or_else(|| comp.get("resourceType"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("Resource")
                                .to_string();
                            let direct_code = comp.get("code").and_then(|v| v.as_str());
                            let r_id = comp
                                .get("resourceId")
                                .or_else(|| comp.get("id"))
                                .or_else(|| comp.get("itemId"))
                                .or_else(|| comp.get("item_id"))
                                .and_then(|v| v.as_str());

                            // 🔥 FIX: Idiomatic Rust block assignment! No more unused assignments.
                            let (r_code, r_desc) = if let Some(id) = r_id {
                                if let Some(res) = app.resources_data.iter().find(|r| r.id == id) {
                                    (
                                        res.code.clone().unwrap_or_else(|| "?".to_string()),
                                        res.description.clone().unwrap_or_default(),
                                    )
                                } else if let Some(mboq) =
                                    app.databook_data.iter().find(|m| m.id == id)
                                {
                                    r_type = "Assembly".to_string();
                                    (
                                        mboq.item_code.clone().unwrap_or_else(|| "?".to_string()),
                                        mboq.description.clone().unwrap_or_default(),
                                    )
                                } else {
                                    (
                                        format!("ID:{}", &id[..std::cmp::min(8, id.len())]),
                                        "Unknown".to_string(),
                                    )
                                }
                            } else if let Some(c) = direct_code {
                                let mut desc = String::new();
                                if let Some(res) = app
                                    .resources_data
                                    .iter()
                                    .find(|r| r.code.as_deref() == Some(c))
                                {
                                    desc = res.description.clone().unwrap_or_default();
                                } else if let Some(mboq) = app
                                    .databook_data
                                    .iter()
                                    .find(|m| m.item_code.as_deref() == Some(c))
                                {
                                    desc = mboq.description.clone().unwrap_or_default();
                                    r_type = "Assembly".to_string();
                                }
                                (c.to_string(), desc)
                            } else {
                                ("?".to_string(), String::new())
                            };

                            let short_desc = if r_desc.is_empty() {
                                String::new()
                            } else {
                                let mut s = r_desc.split('.').next().unwrap_or(&r_desc).to_string();
                                if s.len() > 35 {
                                    s.truncate(35);
                                    s.push_str("..");
                                }
                                format!(" ({})", s.trim())
                            };

                            let r_qty = comp
                                .get("qty")
                                .or_else(|| comp.get("quantity"))
                                .and_then(|v| v.as_f64())
                                .unwrap_or_else(|| {
                                    comp.get("qty")
                                        .and_then(|v| v.as_str())
                                        .and_then(|s| s.parse::<f64>().ok())
                                        .unwrap_or(0.0)
                                });

                            let type_color = match r_type.as_str() {
                                "Material" | "material" => Color::Green,
                                "Labor" | "labor" => Color::Blue,
                                "Machinery" | "machinery" => Color::Magenta,
                                "Assembly" | "assembly" => Color::Cyan,
                                _ => Color::White,
                            };

                            text.push(Line::from(vec![
                                Span::styled(
                                    format!("[{:<9}] ", r_type),
                                    Style::default().fg(type_color),
                                ),
                                Span::styled(
                                    format!("{:>8} ", r_code),
                                    Style::default().fg(Color::Yellow),
                                ),
                                Span::styled(
                                    format!("x {:<6.4}", r_qty),
                                    Style::default().fg(Color::White),
                                ),
                                Span::styled(short_desc, Style::default().fg(Color::DarkGray)),
                            ]));
                        }
                    }
                }
            }
            f.render_widget(Paragraph::new(text).wrap(Wrap { trim: true }), inner_area);
            return;
        }
    }
    f.render_widget(
        Paragraph::new("\n\nNo Databook item selected.")
            .alignment(Alignment::Center)
            .style(Style::default().fg(Color::DarkGray)),
        inner_area,
    );
}
