package utilities;

/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;


//import org.apache.poi.hssf.usermodel.HSSFWorkbook;
//import org.apache.poi.ss.usermodel.Workbook;
//import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.logging.Logger;

import org.apache.poi.xssf.usermodel.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.hssf.usermodel.HSSFDateUtil;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.model.TaskFeature;
import org.smap.sdal.model.TaskListGeoJson;
import org.smap.sdal.model.TaskProperties;
import org.smap.sdal.model.Location;



public class XLSTaskManager {
	
	private static Logger log =
			 Logger.getLogger(SurveyInfo.class.getName());
	
	Workbook wb = null;
	int rowNumber = 1;		// Heading row is 0
	
	private class Column {
		String name;
		String human_name;

		
		public Column(ResourceBundle localisation, int col, String n) {
			name = n;
			//human_name = localisation.getString(n);
			human_name = n;		// Need to work out how to use translations when the file needs to be imported again
		}
		
		// Return the width of this column
		public int getWidth() {
			int width = 256 * 20;		// 20 characters is default
			return width;
		}
		
		// Get a value for this column from the provided properties object
		public String getValue(TaskProperties props) {
			String value = null;
			
			if(name.equals("form")) {
				value = props.form_name;
			} else if(name.equals("name")) {
				value = props.name;
			} else if(name.equals("status")) {
				value = props.status;
			} else if(name.equals("assignee_ident")) {
				value = props.assignee_ident;
			} else if(name.equals("generated_user_name")) {
				value = props.assignee_name;
			} else if(name.equals("location_trigger")) {
				value = props.location_trigger;
			} else if(name.equals("from")) {
				if(props.from == null) {
					value = null;
				} else {
					value = String.valueOf(props.from);
				}
			} else if(name.equals("to")) {
				if(props.to == null) {
					value = null;
				} else {
					value = String.valueOf(props.to);
				}
			} else if(name.equals("guidance")) {
				value = props.guidance;		
			} else if(name.equals("repeat")) {
				value = String.valueOf(props.repeat);
			} else if(name.equals("email")) {
				value = props.emails;
			} else if(name.equals("url")) {
				value = props.url;
			} else if(name.equals("lon")) {
				value = String.valueOf(GeneralUtilityMethods.wktToLatLng(props.location, "lng"));
			} else if(name.equals("lat")) {
				value = String.valueOf(GeneralUtilityMethods.wktToLatLng(props.location, "lat"));
			} else if(name.equals("address")) {
				value = props.address;
			}
			
			if(value == null) {
				value = "";
			}
			return value;
		}
	
		// Get a date value for this column from the provided properties object
		public Timestamp getDateValue(TaskProperties props) {
			Timestamp value = null;
			
			if(name.equals("from")) {
				value = props.from;
			} else if(name.equals("to")) {
				value = props.to;
			} 
			
			return value;
		}
	}

	public XLSTaskManager() {

	}
	
	public XLSTaskManager(String type) {
		if(type != null && type.equals("xls")) {
			wb = new HSSFWorkbook();
		} else {
			wb = new XSSFWorkbook();
		}
	}
	
	/*
	 * Create a task list from an XLS file
	 */
	public TaskListGeoJson getXLSTaskList(String type, InputStream inputStream, ResourceBundle localisation) throws Exception {
		
		Sheet sheet = null;
		Sheet settingsSheet = null;
        Row row = null;
        int lastRowNum = 0;
        TaskListGeoJson tl = new TaskListGeoJson();
        tl.features = new ArrayList<TaskFeature> ();
        HashMap<String, Integer> header = null;
		String tz = "GMT";
        
		if(type != null && type.equals("xls")) {
			wb = new HSSFWorkbook(inputStream);
		} else {
			wb = new XSSFWorkbook(inputStream);
		}
		
		/*
		 * Get the task sheet settings
		 */
		settingsSheet = wb.getSheet("settings");
		if(settingsSheet.getPhysicalNumberOfRows() > 0) {
			int lastSettingsRow = settingsSheet.getLastRowNum();
			for(int j = 0; j <= lastSettingsRow; j++) {
				row = settingsSheet.getRow(j);
                
                if(row != null) {         	
                    int lastCellNum = row.getLastCellNum();
                    if(lastCellNum > 0) {
                    	Cell c = row.getCell(0);
                    	String k = c.getStringCellValue();
                    	if(k != null && k.trim().toLowerCase().equals("time zone:")) {
                    		c = row.getCell(1);
                    		tz = c.getStringCellValue();
                    		break;
                    	}
                    }
                }
			}
		}
		
		ZoneId timeZoneId = ZoneId.of(tz);
		ZoneId gmtZoneId = ZoneId.of("GMT");
		
		sheet = wb.getSheet("tasks");
		if(sheet.getPhysicalNumberOfRows() > 0) {
			
			lastRowNum = sheet.getLastRowNum();
			boolean needHeader = true;
			
            for(int j = 0; j <= lastRowNum; j++) {
                
            	row = sheet.getRow(j);
                
                if(row != null) {
                	
                    int lastCellNum = row.getLastCellNum();
                    
                	if(needHeader) {
                		header = getHeader(row, lastCellNum);
                		needHeader = false;
                	} else {
                		TaskFeature tf = new TaskFeature();
                		TaskProperties tp = new TaskProperties();
                		tf.properties = tp;

            			tp.id = 0;
            			tp.form_name = getColumn(row, "form", header, lastCellNum, null);
            			if(tp.form_name == null || tp.form_name.trim().length() == 0) {
            				continue;	// No form no task
            			}
            			tp.name = getColumn(row, "name", header, lastCellNum, "");
            			tp.status = getColumn(row, "status", header, lastCellNum, "new");
            			tp.location_trigger = getColumn(row, "location_trigger", header, lastCellNum, null);
            			tp.assignee_ident = getColumn(row, "assignee_ident", header, lastCellNum, null);
            			if(tp.assignee_ident == null || tp.assignee_ident.trim().length() == 0) {
            				String genUser = getColumn(row, "generate_user", header, lastCellNum, null);
            				if(genUser != null && genUser.trim().toLowerCase().equals("yes")) {
            					tp.generate_user = true;
            					tp.assignee_name = getColumn(row, "generated_user_name", header, lastCellNum, null);
            					if(tp.assignee_name == null || tp.assignee_name.trim().length() == 0) {
            						throw new Exception(localisation.getString("t_no_user_name"));
            					}
            				} else {
            					throw new Exception(localisation.getString("t_no_user"));
            				}
            			}
            			tp.location = "POINT(" + getColumn(row, "lon", header, lastCellNum, "0") + " " + 
            					getColumn(row, "lat", header, lastCellNum, "0") + ")";
            			tp.guidance = getColumn(row, "guidance", header, lastCellNum, null);
            			
            			// Get from value
            			tp.from = getGmtDate(row, "from", header, lastCellNum, timeZoneId, gmtZoneId);
            			tp.to = getGmtDate(row, "to", header, lastCellNum, timeZoneId, gmtZoneId);
            			
            			String repValue = getColumn(row, "repeat", header, lastCellNum, null);
            			if(repValue != null && repValue.equals("true")) {
            				tp.repeat = true;
            			} else {
            				tp.repeat = false;
            			}
            		    
            			tl.features.add(tf);
                	
                	}
                	
                }
                
            }
		}
	
		return tl;
		
		
	}
	
	/*
	 * Get a GMT date from the spreadsheet
	 */
	Timestamp getGmtDate(Row row, String name, HashMap<String, Integer> header, int lastCellNum, ZoneId timeZoneId, ZoneId gmtZoneId) throws Exception {
		
		Timestamp result = null;
		
		if(getDateColumn(row, name, header, lastCellNum, null) != null) {
			LocalDateTime localDate = getDateColumn(row, name, header, lastCellNum, null).toLocalDateTime();
			ZonedDateTime localZoned = ZonedDateTime.of(localDate, timeZoneId);
			ZonedDateTime gmtZoned = localZoned.withZoneSameInstant(gmtZoneId);
			result = Timestamp.valueOf(gmtZoned.toLocalDateTime());
		}
		
		return result;
	}
	
	/*
	 * Write a task list to an XLS file
	 */
	public void createXLSTaskFile(OutputStream outputStream, TaskListGeoJson tl, ResourceBundle localisation, 
			String tz) throws IOException {
		
		Sheet taskListSheet = wb.createSheet("tasks");
		Sheet taskSettingsSheet = wb.createSheet("settings");
		taskListSheet.createFreezePane(3, 1);	// Freeze header row and first 3 columns
		
		Map<String, CellStyle> styles = XLSUtilities.createStyles(wb);

		ArrayList<Column> cols = getColumnList(localisation);
		createHeader(cols, taskListSheet, styles);	
		processTaskListForXLS(tl, taskListSheet, taskSettingsSheet, styles, cols, tz);
		
		wb.write(outputStream);
		outputStream.close();
	}
	
	/*
	 * Get an array of locations from an XLS file
	 */
	public ArrayList<Location> convertWorksheetToTagArray(InputStream inputStream, String type) throws Exception {
		
		Sheet sheet = null;
        Row row = null;
        int lastRowNum = 0;
        String group = null;
        ArrayList<Location> tags = new ArrayList<Location> ();
        HashMap<String, Integer> header = null;
        
		if(type != null && type.equals("xls")) {
			wb = new HSSFWorkbook(inputStream);
		} else {
			wb = new XSSFWorkbook(inputStream);
		}
		
		int numSheets = wb.getNumberOfSheets();
		
		for(int i = 0; i < numSheets; i++) {
			sheet = wb.getSheetAt(i);
			if(sheet.getPhysicalNumberOfRows() > 0) {
				
				group = sheet.getSheetName();
				lastRowNum = sheet.getLastRowNum();
				boolean needHeader = true;
				
                for(int j = 0; j <= lastRowNum; j++) {
                    
                	row = sheet.getRow(j);
                    
                    if(row != null) {
                    	
                        int lastCellNum = row.getLastCellNum();
                        
                    	if(needHeader) {
                    		header = getHeader(row, lastCellNum);
                    		needHeader = false;
                    	} else {
                    		Location t = new Location();
                    		t.group = group;
                    		t.type = "nfc";
                    		try {
                    			t.uid = getColumn(row, "uid", header, lastCellNum, null);
                    			t.name = getColumn(row, "tagname", header, lastCellNum, null);
                    			tags.add(t);
                    		} catch (Exception e) {
                    			log.info("Error getting nfc column" + e.getMessage());
                    		}
                    	}
                    	
                    }
                    
                }
			}
		}
		
		return tags;

	}
	
	/*
	 * Create an XLS file from an array of tag locations
	 */
	/*
	 * Write a task list to an XLS file
	 */
	public void createXLSLocationsFile(OutputStream outputStream, ArrayList<Location> locations, ResourceBundle localisation) throws IOException {
		
		HashMap<String, Sheet> sheetMap = new HashMap<String, Sheet> ();
		HashMap<String, Integer> rowMap = new HashMap<String, Integer> ();
		
		ArrayList<Column> cols = getLocationColumnList(localisation);
		Map<String, CellStyle> styles = XLSUtilities.createStyles(wb);
		
		/*
		 * Create the worksheets
		 */
		for(int i = 0; i < locations.size(); i++) {
			Location l = locations.get(i);
			Sheet ns = sheetMap.get(l.group);
			if(ns == null) {
				ns = wb.createSheet(l.group);
				createHeader(cols, ns, styles);
				sheetMap.put(l.group, ns);
				rowMap.put(l.group, 1);
			}
			addLocation(l, ns, styles, rowMap);
		}
		
		
		wb.write(outputStream);
		outputStream.close();
	}

	
	/*
	 * Get a hashmap of column name and column index
	 */
	private HashMap<String, Integer> getHeader(Row row, int lastCellNum) {
		HashMap<String, Integer> header = new HashMap<String, Integer> ();
		
		Cell cell = null;
		String name = null;
		
        for(int i = 0; i <= lastCellNum; i++) {
            cell = row.getCell(i);
            if(cell != null) {
                name = cell.getStringCellValue();
                if(name != null && name.trim().length() > 0) {
                	name = name.toLowerCase();
                    header.put(name, i);
                }
            }
        }
            
		return header;
	}
	
	/*
	 * Get the value of a cell at the specified column
	 */
	private String getColumn(Row row, String name, HashMap<String, Integer> header, int lastCellNum, String def) throws Exception {
		
		Integer cellIndex;
		int idx;
		String value = null;
		double dValue = 0.0;
		Date dateValue = null;
		SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd hh:mm");
	
		cellIndex = header.get(name);
		if(cellIndex != null) {
			idx = cellIndex;
			if(idx <= lastCellNum) {
				Cell c = row.getCell(idx);
				if(c != null) {
					if(c.getCellType() == Cell.CELL_TYPE_NUMERIC || c.getCellType() == Cell.CELL_TYPE_FORMULA) {
						if (HSSFDateUtil.isCellDateFormatted(c)) {
							dateValue = c.getDateCellValue();
							value = dateFormat.format(dateValue);
						} else {
							dValue = c.getNumericCellValue();
							value = String.valueOf(dValue);
							if(value != null && value.endsWith(".0")) {
								value = value.substring(0, value.lastIndexOf('.'));
							}
						}
					} else if(c.getCellType() == Cell.CELL_TYPE_STRING) {
						value = c.getStringCellValue();
					} else {
						value = null;
					}

				}
			}
		} else {
			throw new Exception("Column " + name + " not found");
		}

		if(value == null) {		// Set to default value if null
			value = def;
		}
		
		return value;
	}
	
	/*
	 * Get the timestamp value of a cell at the specified column
	 */
	private Timestamp getDateColumn(Row row, String name, HashMap<String, Integer> header, int lastCellNum, String def) throws Exception {
		
		Integer cellIndex;
		int idx;
		Timestamp tsValue = null;
	
		cellIndex = header.get(name);
		if(cellIndex != null) {
			idx = cellIndex;
			if(idx <= lastCellNum) {
				Cell c = row.getCell(idx);
				if(c != null) {
					log.info("Get date column: " + name);
					if(c.getCellType() == Cell.CELL_TYPE_NUMERIC) {
						if (HSSFDateUtil.isCellDateFormatted(c)) {
							tsValue = new Timestamp(c.getDateCellValue().getTime());
						} 
					} 
				}
			}
		} else {
			throw new Exception("Column " + name + " not found");
		}
		
		return tsValue;
	}
	
	/*
	 * Get the columns for the tasks sheet
	 */
	private ArrayList<Column> getColumnList(ResourceBundle localisation) {
		
		ArrayList<Column> cols = new ArrayList<Column> ();
		
		int colNumber = 0;
	
		cols.add(new Column(localisation, colNumber++, "form"));
		cols.add(new Column(localisation, colNumber++, "name"));
		cols.add(new Column(localisation, colNumber++, "status"));
		cols.add(new Column(localisation, colNumber++, "assignee_ident"));
		cols.add(new Column(localisation, colNumber++, "generate_user"));
		cols.add(new Column(localisation, colNumber++, "generated_user_name"));
		cols.add(new Column(localisation, colNumber++, "email"));
		cols.add(new Column(localisation, colNumber++, "location_trigger"));
		cols.add(new Column(localisation, colNumber++, "from"));
		cols.add(new Column(localisation, colNumber++, "to"));
		cols.add(new Column(localisation, colNumber++, "guidance"));
		cols.add(new Column(localisation, colNumber++, "repeat"));
		cols.add(new Column(localisation, colNumber++, "url"));
		cols.add(new Column(localisation, colNumber++, "address"));
		cols.add(new Column(localisation, colNumber++, "lon"));
		cols.add(new Column(localisation, colNumber++, "lat"));
		
		
		return cols;
	}
	
	/*
	 * Get the columns for the task location sheet
	 */
	private ArrayList<Column> getLocationColumnList(ResourceBundle localisation) {
		
		ArrayList<Column> cols = new ArrayList<Column> ();
		
		int colNumber = 0;
	
		cols.add(new Column(localisation, colNumber++, "UID"));
		cols.add(new Column(localisation, colNumber++, "tagName"));
		
		return cols;
	}
    
	/*
	 * Create a header row and set column widths
	 */
	private void createHeader(ArrayList<Column> cols, Sheet sheet, Map<String, CellStyle> styles) {
		// Set column widths
		for(int i = 0; i < cols.size(); i++) {
			sheet.setColumnWidth(i, cols.get(i).getWidth());
		}
				
		Row headerRow = sheet.createRow(0);
		CellStyle headerStyle = styles.get("header");
		for(int i = 0; i < cols.size(); i++) {
			Column col = cols.get(i);
			
            Cell cell = headerRow.createCell(i);
            cell.setCellStyle(headerStyle);
            cell.setCellValue(col.human_name);
        }
	}
	
	/*
	 * Convert a task list array to XLS
	 */
	private void processTaskListForXLS(
			TaskListGeoJson tl, 
			Sheet sheet,
			Sheet settingsSheet,
			Map<String, CellStyle> styles,
			ArrayList<Column> cols,
			String tz) throws IOException {
		
		DataFormat format = wb.createDataFormat();
		CellStyle styleTimestamp = wb.createCellStyle();
		ZoneId timeZoneId = ZoneId.of(tz);
		ZoneId gmtZoneId = ZoneId.of("GMT");
		
		styleTimestamp.setDataFormat(format.getFormat("yyyy-mm-dd h:mm"));	
		
		for(TaskFeature feature : tl.features)  {
			
			TaskProperties props = feature.properties;
				
			Row row = sheet.createRow(rowNumber++);
			for(int i = 0; i < cols.size(); i++) {
				Column col = cols.get(i);			
				Cell cell = row.createCell(i);

				if(col.name.equals("from") || col.name.equals("to")) {
					cell.setCellStyle(styleTimestamp);
					
					if(col.getDateValue(props) != null) {
						LocalDateTime gmtDate = col.getDateValue(props).toLocalDateTime();
						ZonedDateTime gmtZoned = ZonedDateTime.of(gmtDate, gmtZoneId);
						ZonedDateTime localZoned = gmtZoned.withZoneSameInstant(timeZoneId);
						LocalDateTime localDate = localZoned.toLocalDateTime();
						Timestamp ts2 = Timestamp.valueOf(localDate);
						cell.setCellValue(ts2);
					}

				} else {
					cell.setCellStyle(styles.get("default"));	
					cell.setCellValue(col.getValue(props));
				}
	        }	
		}
		
		// Populate settings sheet
		Row settingsRow = settingsSheet.createRow(0);
		Cell k = null;
		Cell v = null;
		k = settingsRow.createCell(0);
		k.setCellValue("Time Zone:");
		v = settingsRow.createCell(1);
		v.setCellValue(tz);
	}
	
	/*
	 * add a location to XLS
	 */
	private void addLocation(
			
		Location l, 
		Sheet sheet,
		Map<String, CellStyle> styles,
		Map<String, Integer> rowMap) throws IOException {
		
		int groupRow = rowMap.get(l.group);
		
		Row row = sheet.createRow(groupRow++);
		rowMap.put(l.group, groupRow);
		
		Cell cell = row.createCell(0);
		cell.setCellStyle(styles.get("default"));	
		cell.setCellValue(l.uid);
	    
		cell = row.createCell(1);
		cell.setCellStyle(styles.get("default"));	
		cell.setCellValue(l.name);

	
	}

}
