use crate::app::{App, DirectoryFocus, DirectoryTab};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
};

pub fn render(f: &mut Frame, app: &mut App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)])
        .split(area);

    render_form(f, app, chunks[0]);
    render_table(f, app, chunks[1]);
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
            Constraint::Percentage(20), // Name
            Constraint::Percentage(20), // Comp/Dept
            Constraint::Percentage(20), // Type/Role
            Constraint::Percentage(20), // Email
            Constraint::Percentage(20), // Phone
        ])
        .split(form_chunks[1]);

    let submit_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Length(28), Constraint::Min(0)])
        .split(form_chunks[2]);

    let help = Paragraph::new(
        "Cycle: [UP]/[DOWN]  |  Table: [PgUp]/[PgDn]  |  [F2] Edit  |  [F3] Clear  |  [F4] Delete  |  [F6] Toggle Staff/CRM",
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

    let is_staff = app.dir_tab == DirectoryTab::Staff;

    let is_name = app.dir_focus == DirectoryFocus::Name;
    let name_p = Paragraph::new(app.dir_name.value())
        .style(get_style(is_name))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 1. Full Name ")
                .border_style(Style::default().fg(get_border(is_name))),
        );
    f.render_widget(name_p, input_chunks[0]);
    if is_name {
        f.set_cursor_position((
            input_chunks[0].x + app.dir_name.visual_cursor() as u16 + 1,
            input_chunks[0].y + 1,
        ));
    }

    let is_cd = app.dir_focus == DirectoryFocus::CompDept;
    let cd_title = if is_staff {
        " 2. Department "
    } else {
        " 2. Company "
    };
    let cd_p = Paragraph::new(app.dir_comp_dept.value())
        .style(get_style(is_cd))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(cd_title)
                .border_style(Style::default().fg(get_border(is_cd))),
        );
    f.render_widget(cd_p, input_chunks[1]);
    if is_cd {
        f.set_cursor_position((
            input_chunks[1].x + app.dir_comp_dept.visual_cursor() as u16 + 1,
            input_chunks[1].y + 1,
        ));
    }

    let is_tr = app.dir_focus == DirectoryFocus::TypeRole;
    let tr_title = if is_staff {
        " 3. Designation "
    } else {
        " 3. Contact Type "
    };
    let tr_p = Paragraph::new(app.dir_type_role.value())
        .style(get_style(is_tr))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(tr_title)
                .border_style(Style::default().fg(get_border(is_tr))),
        );
    f.render_widget(tr_p, input_chunks[2]);
    if is_tr {
        f.set_cursor_position((
            input_chunks[2].x + app.dir_type_role.visual_cursor() as u16 + 1,
            input_chunks[2].y + 1,
        ));
    }

    let is_email = app.dir_focus == DirectoryFocus::Email;
    let email_p = Paragraph::new(app.dir_email.value())
        .style(get_style(is_email))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 4. Email Address ")
                .border_style(Style::default().fg(get_border(is_email))),
        );
    f.render_widget(email_p, input_chunks[3]);
    if is_email {
        f.set_cursor_position((
            input_chunks[3].x + app.dir_email.visual_cursor() as u16 + 1,
            input_chunks[3].y + 1,
        ));
    }

    let is_phone = app.dir_focus == DirectoryFocus::Phone;
    let phone_p = Paragraph::new(app.dir_phone.value())
        .style(get_style(is_phone))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 5. Phone Number ")
                .border_style(Style::default().fg(get_border(is_phone))),
        );
    f.render_widget(phone_p, input_chunks[4]);
    if is_phone {
        f.set_cursor_position((
            input_chunks[4].x + app.dir_phone.visual_cursor() as u16 + 1,
            input_chunks[4].y + 1,
        ));
    }

    let is_submit = app.dir_focus == DirectoryFocus::Submit;
    let btn_bg = if app.dir_edit_id.is_some() {
        Color::Blue
    } else {
        Color::Green
    };
    let btn_text = if app.dir_edit_id.is_some() {
        " [ UPDATE RECORD ] "
    } else {
        " [ SAVE RECORD ] "
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

    let stat_col = if app.dir_status_message.contains("ERROR") {
        Color::Red
    } else {
        Color::Green
    };
    let stat = Paragraph::new(app.dir_status_message.clone())
        .style(Style::default().fg(stat_col).add_modifier(Modifier::BOLD))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" SYSTEM STATUS "),
        );
    f.render_widget(stat, submit_chunks[1]);
}

fn render_table(f: &mut Frame, app: &mut App, area: Rect) {
    let is_staff = app.dir_tab == DirectoryTab::Staff;

    let col2 = if is_staff { "DEPARTMENT" } else { "COMPANY" };
    let col3 = if is_staff { "DESIGNATION" } else { "TYPE" };

    // 🔥 FIX: Changed .iter() to .into_iter() to properly consume the temporary array!
    let header_cells = ["NAME", col2, col3, "EMAIL", "PHONE"].into_iter().map(|h| {
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

    let rows: Vec<Row> = if is_staff {
        app.staff_data
            .iter()
            .map(|s| {
                Row::new(vec![
                    Cell::from(s.name.as_deref().unwrap_or("").to_string()).style(
                        Style::default()
                            .fg(Color::Yellow)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Cell::from(s.department.as_deref().unwrap_or("").to_string()),
                    Cell::from(s.designation.as_deref().unwrap_or("").to_string()),
                    Cell::from(s.email.as_deref().unwrap_or("").to_string()),
                    Cell::from(s.phone.as_deref().unwrap_or("").to_string()),
                ])
                .height(1)
            })
            .collect()
    } else {
        app.crm_data
            .iter()
            .map(|c| {
                let color = match c.contact_type.as_deref().unwrap_or("") {
                    "Client" => Color::Green,
                    "Supplier" => Color::Magenta,
                    "Subcontractor" => Color::Blue,
                    _ => Color::White,
                };
                Row::new(vec![
                    Cell::from(c.name.as_deref().unwrap_or("").to_string()).style(
                        Style::default()
                            .fg(Color::Yellow)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Cell::from(c.company.as_deref().unwrap_or("").to_string()),
                    Cell::from(c.contact_type.as_deref().unwrap_or("").to_string())
                        .style(Style::default().fg(color)),
                    Cell::from(c.email.as_deref().unwrap_or("").to_string()),
                    Cell::from(c.phone.as_deref().unwrap_or("").to_string()),
                ])
                .height(1)
            })
            .collect()
    };

    let title = if is_staff {
        " INTERNAL ORG DIRECTORY (Press F6 for CRM) "
    } else {
        " CRM CONTACTS (Press F6 for Staff) "
    };
    let border_color = if is_staff { Color::Blue } else { Color::Green };

    let table = Table::new(
        rows,
        [
            Constraint::Percentage(20),
            Constraint::Percentage(20),
            Constraint::Percentage(20),
            Constraint::Percentage(25),
            Constraint::Percentage(15),
        ],
    )
    .header(header)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .title(title)
            .border_style(Style::default().fg(border_color)),
    )
    .row_highlight_style(
        Style::default()
            .add_modifier(Modifier::REVERSED)
            .fg(Color::Cyan),
    )
    .highlight_symbol(">> ");

    f.render_stateful_widget(table, area, &mut app.dir_table_state);
}
