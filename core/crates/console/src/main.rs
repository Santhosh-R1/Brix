mod app;
mod ui;

use app::{App, DatabookFocus, DirectoryFocus, Page, ResourceFocus, ServerFocus};
use ratatui::crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use std::time::Duration;
use tui_input::backend::crossterm::EventHandler;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut terminal = ratatui::init();
    let mut app = App::new().await?;

    let mut last_tick = std::time::Instant::now();
    let tick_rate = Duration::from_millis(1000);

    loop {
        terminal.draw(|f| ui::ui(f, &mut app))?;

        let timeout = tick_rate.saturating_sub(last_tick.elapsed());
        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    // --- Dashboard & Server Input Handling ---
                    if app.active_page == Page::Dashboard {
                        match key.code {
                            KeyCode::Down | KeyCode::Tab => {
                                app.server_focus = match app.server_focus {
                                    ServerFocus::PortInput => ServerFocus::StartStop,
                                    ServerFocus::StartStop => ServerFocus::TrafficTable,
                                    ServerFocus::TrafficTable => ServerFocus::LogArea,
                                    ServerFocus::LogArea => ServerFocus::PortInput,
                                };
                                continue;
                            }
                            KeyCode::Up | KeyCode::BackTab => {
                                app.server_focus = match app.server_focus {
                                    ServerFocus::PortInput => ServerFocus::LogArea,
                                    ServerFocus::StartStop => ServerFocus::PortInput,
                                    ServerFocus::TrafficTable => ServerFocus::StartStop,
                                    ServerFocus::LogArea => ServerFocus::TrafficTable,
                                };
                                continue;
                            }
                            KeyCode::Enter if app.server_focus == ServerFocus::PortInput => {
                                app.apply_server_config().await;
                                continue;
                            }
                            KeyCode::Enter if app.server_focus == ServerFocus::StartStop => {
                                app.toggle_server().await;
                                continue;
                            }
                            _ => {}
                        }

                        if app.server_focus == ServerFocus::PortInput {
                            app.server_port_input.handle_event(&Event::Key(key));
                            continue;
                        }
                    }

                    // --- Resources Page ---
                    if app.active_page == Page::Resources {
                        if app.show_region_manager {
                            match key.code {
                                KeyCode::Esc | KeyCode::F(6) => {
                                    app.show_region_manager = false;
                                    continue;
                                }
                                KeyCode::Up => {
                                    app.scroll_region_up();
                                    continue;
                                }
                                KeyCode::Down => {
                                    app.scroll_region_down();
                                    continue;
                                }
                                KeyCode::Enter => {
                                    app.submit_region().await;
                                    continue;
                                }
                                KeyCode::F(4) => {
                                    app.delete_selected_region().await;
                                    continue;
                                }
                                _ => {
                                    app.region_input.handle_event(&Event::Key(key));
                                    continue;
                                }
                            }
                        }

                        match key.code {
                            KeyCode::PageDown => {
                                app.scroll_table_down();
                                continue;
                            }
                            KeyCode::PageUp => {
                                app.scroll_table_up();
                                continue;
                            }
                            KeyCode::F(2) => {
                                app.load_selected_resource();
                                continue;
                            }
                            KeyCode::F(3) => {
                                app.clear_resource_form();
                                continue;
                            }
                            KeyCode::F(4) => {
                                app.delete_selected_resource().await;
                                continue;
                            }
                            KeyCode::F(6) => {
                                app.show_region_manager = true;
                                continue;
                            }

                            KeyCode::Up | KeyCode::BackTab => {
                                app.res_focus = match app.res_focus {
                                    ResourceFocus::Code => ResourceFocus::Submit,
                                    ResourceFocus::Description => ResourceFocus::Code,
                                    ResourceFocus::Unit => ResourceFocus::Description,
                                    ResourceFocus::Rate => ResourceFocus::Unit,
                                    ResourceFocus::Submit => ResourceFocus::Rate,
                                };
                                continue;
                            }
                            KeyCode::Down | KeyCode::Tab | KeyCode::Enter => {
                                if key.code == KeyCode::Enter
                                    && app.res_focus == ResourceFocus::Submit
                                {
                                    app.submit_resource().await;
                                    continue;
                                }
                                app.res_focus = match app.res_focus {
                                    ResourceFocus::Code => ResourceFocus::Description,
                                    ResourceFocus::Description => ResourceFocus::Unit,
                                    ResourceFocus::Unit => ResourceFocus::Rate,
                                    ResourceFocus::Rate => ResourceFocus::Submit,
                                    ResourceFocus::Submit => ResourceFocus::Code,
                                };
                                continue;
                            }
                            _ => {}
                        }

                        match app.res_focus {
                            ResourceFocus::Code => {
                                app.res_code.handle_event(&Event::Key(key));
                            }
                            ResourceFocus::Description => {
                                app.res_desc.handle_event(&Event::Key(key));
                            }
                            ResourceFocus::Unit => {
                                app.res_unit.handle_event(&Event::Key(key));
                            }
                            ResourceFocus::Rate => {
                                app.res_rate.handle_event(&Event::Key(key));
                            }
                            _ => {}
                        }
                    }

                    // --- Databook Page ---
                    if app.active_page == Page::Databook {
                        match key.code {
                            KeyCode::PageDown => {
                                app.scroll_dbk_down();
                                continue;
                            }
                            KeyCode::PageUp => {
                                app.scroll_dbk_up();
                                continue;
                            }

                            KeyCode::F(2) => {
                                app.load_selected_databook();
                                continue;
                            }
                            KeyCode::F(3) => {
                                app.clear_databook_form();
                                continue;
                            }
                            KeyCode::F(4) => {
                                app.delete_selected_databook().await;
                                continue;
                            }

                            KeyCode::Up | KeyCode::BackTab => {
                                app.dbk_focus = match app.dbk_focus {
                                    DatabookFocus::Code => DatabookFocus::Submit,
                                    DatabookFocus::Description => DatabookFocus::Code,
                                    DatabookFocus::Unit => DatabookFocus::Description,
                                    DatabookFocus::Margins => DatabookFocus::Unit,
                                    DatabookFocus::Components => DatabookFocus::Margins,
                                    DatabookFocus::Submit => DatabookFocus::Components,
                                };
                                continue;
                            }
                            KeyCode::Down | KeyCode::Tab | KeyCode::Enter => {
                                if key.code == KeyCode::Enter
                                    && app.dbk_focus == DatabookFocus::Submit
                                {
                                    app.submit_databook().await;
                                    continue;
                                }
                                app.dbk_focus = match app.dbk_focus {
                                    DatabookFocus::Code => DatabookFocus::Description,
                                    DatabookFocus::Description => DatabookFocus::Unit,
                                    DatabookFocus::Unit => DatabookFocus::Margins,
                                    DatabookFocus::Margins => DatabookFocus::Components,
                                    DatabookFocus::Components => DatabookFocus::Submit,
                                    DatabookFocus::Submit => DatabookFocus::Code,
                                };
                                continue;
                            }
                            _ => {}
                        }

                        match app.dbk_focus {
                            DatabookFocus::Code => {
                                app.dbk_code.handle_event(&Event::Key(key));
                            }
                            DatabookFocus::Description => {
                                app.dbk_desc.handle_event(&Event::Key(key));
                            }
                            DatabookFocus::Unit => {
                                app.dbk_unit.handle_event(&Event::Key(key));
                            }
                            DatabookFocus::Margins => {
                                app.dbk_margins.handle_event(&Event::Key(key));
                            }
                            DatabookFocus::Components => {
                                app.dbk_comps.handle_event(&Event::Key(key));
                            }
                            _ => {}
                        }
                    }

                    // --- Directory Page ---
                    if app.active_page == Page::Directory {
                        if key.code == KeyCode::F(6)
                            || (key.modifiers.contains(KeyModifiers::CONTROL)
                                && key.code == KeyCode::Char('t'))
                        {
                            app.toggle_dir_tab();
                            continue;
                        }

                        match key.code {
                            KeyCode::PageDown => {
                                app.scroll_dir_down();
                                continue;
                            }
                            KeyCode::PageUp => {
                                app.scroll_dir_up();
                                continue;
                            }

                            KeyCode::F(2) => {
                                app.load_selected_dir();
                                continue;
                            }
                            KeyCode::F(3) => {
                                app.clear_dir_form();
                                continue;
                            }
                            KeyCode::F(4) => {
                                app.delete_selected_dir().await;
                                continue;
                            }

                            KeyCode::Up | KeyCode::BackTab => {
                                app.dir_focus = match app.dir_focus {
                                    DirectoryFocus::Name => DirectoryFocus::Submit,
                                    DirectoryFocus::CompDept => DirectoryFocus::Name,
                                    DirectoryFocus::TypeRole => DirectoryFocus::CompDept,
                                    DirectoryFocus::Email => DirectoryFocus::TypeRole,
                                    DirectoryFocus::Phone => DirectoryFocus::Email,
                                    DirectoryFocus::Submit => DirectoryFocus::Phone,
                                };
                                continue;
                            }
                            KeyCode::Down | KeyCode::Tab | KeyCode::Enter => {
                                if key.code == KeyCode::Enter
                                    && app.dir_focus == DirectoryFocus::Submit
                                {
                                    app.submit_dir().await;
                                    continue;
                                }
                                app.dir_focus = match app.dir_focus {
                                    DirectoryFocus::Name => DirectoryFocus::CompDept,
                                    DirectoryFocus::CompDept => DirectoryFocus::TypeRole,
                                    DirectoryFocus::TypeRole => DirectoryFocus::Email,
                                    DirectoryFocus::Email => DirectoryFocus::Phone,
                                    DirectoryFocus::Phone => DirectoryFocus::Submit,
                                    DirectoryFocus::Submit => DirectoryFocus::Name,
                                };
                                continue;
                            }
                            _ => {}
                        }

                        match app.dir_focus {
                            DirectoryFocus::Name => {
                                app.dir_name.handle_event(&Event::Key(key));
                            }
                            DirectoryFocus::CompDept => {
                                app.dir_comp_dept.handle_event(&Event::Key(key));
                            }
                            DirectoryFocus::TypeRole => {
                                app.dir_type_role.handle_event(&Event::Key(key));
                            }
                            DirectoryFocus::Email => {
                                app.dir_email.handle_event(&Event::Key(key));
                            }
                            DirectoryFocus::Phone => {
                                app.dir_phone.handle_event(&Event::Key(key));
                            }
                            _ => {}
                        }
                    }

                    // 🔥 NEW: Archive Page Input Handling
                    if app.active_page == Page::ProjectArchive {
                        match key.code {
                            KeyCode::Down | KeyCode::PageDown => {
                                app.scroll_archive_down();
                                continue;
                            }
                            KeyCode::Up | KeyCode::PageUp => {
                                app.scroll_archive_up();
                                continue;
                            }
                            _ => {}
                        }
                    }

                    // --- Global Navigation ---
                    match key.code {
                        KeyCode::Esc => app.should_quit = true,
                        KeyCode::Right => app.next_page(),
                        KeyCode::Left => app.previous_page(),
                        KeyCode::F(5) => app.refresh_data().await,
                        _ => {}
                    }
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            app.refresh_data().await;
            last_tick = std::time::Instant::now();
        }

        if app.should_quit {
            break;
        }
    }

    ratatui::restore();
    Ok(())
}
